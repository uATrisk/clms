import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { logStatusChange } from '../utils/status-logger';

const queueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getOrdersQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = queueQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid pagination parameters', details: parsed.error.format() });
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          orderCode: true,
          bagNumber: true,
          selfReportedCount: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          student: {
            select: {
              name: true,
              email: true,
              collegeId: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: {
          status: 'SUBMITTED',
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['ACCEPTED', 'PROCESSING', 'DELAYED'],
        },
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            mobileNumber: true,
            collegeId: true,
          },
        },
      },
      orderBy: {
        acceptedAt: 'asc',
      },
    });

    res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
};

const acceptOrderSchema = z.object({
  verifiedCount: z.number().int().positive('Verified item count must be a positive integer'),
});

export const acceptOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const authReq = req as AuthenticatedRequest;
    const staffId = authReq.user?.id;

    if (!staffId) {
      const error = new Error('Unauthorized: Staff ID not found in token') as AppError;
      error.status = 401;
      throw error;
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.active) {
      const error = new Error('Unauthorized: Staff record not found or inactive') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = acceptOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { verifiedCount } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      const error = new Error('Order not found') as AppError;
      error.status = 404;
      throw error;
    }

    if (order.status !== 'SUBMITTED') {
      const error = new Error(
        `Cannot accept order. Current status is ${order.status}. Only orders with status SUBMITTED can be accepted.`
      ) as AppError;
      error.status = 400;
      throw error;
    }

    const isMismatch = verifiedCount !== order.selfReportedCount;
    const mismatchNote = isMismatch
      ? `Count mismatch detected. Self-reported: ${order.selfReportedCount}, Verified: ${verifiedCount}`
      : undefined;

    const now = new Date();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          verifiedCount,
          countMismatchFlag: isMismatch,
          assignedWasherId: staffId,
          acceptedAt: now,
          status: 'PROCESSING',
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
              mobileNumber: true,
              collegeId: true,
            },
          },
        },
      });

      // 1. Log transition: SUBMITTED -> ACCEPTED
      await logStatusChange({
        orderId: id,
        fromStatus: 'SUBMITTED',
        toStatus: 'ACCEPTED',
        changedById: staffId,
        note: mismatchNote,
        tx,
      });

      // 2. Log transition: ACCEPTED -> PROCESSING
      await logStatusChange({
        orderId: id,
        fromStatus: 'ACCEPTED',
        toStatus: 'PROCESSING',
        changedById: staffId,
        tx,
      });

      return updated;
    });

    res.status(200).json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

const updateStatusSchema = z
  .object({
    action: z.enum(['set_eta', 'mark_ready']),
    expectedReadyAt: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'set_eta') {
        return !!data.expectedReadyAt && !isNaN(Date.parse(data.expectedReadyAt));
      }
      return true;
    },
    {
      message: 'expectedReadyAt is required and must be a valid date when action is set_eta',
      path: ['expectedReadyAt'],
    }
  );

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const authReq = req as AuthenticatedRequest;
    const staffId = authReq.user?.id;

    if (!staffId) {
      const error = new Error('Unauthorized: Staff ID not found in token') as AppError;
      error.status = 401;
      throw error;
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.active) {
      const error = new Error('Unauthorized: Staff record not found or inactive') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { action, expectedReadyAt } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      const error = new Error('Order not found') as AppError;
      error.status = 404;
      throw error;
    }

    if (order.status !== 'PROCESSING') {
      const error = new Error(
        `Invalid status transition: Order is currently ${order.status}. Status updates are only allowed for orders in PROCESSING status.`
      ) as AppError;
      error.status = 400;
      throw error;
    }

    if (action === 'set_eta') {
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          expectedReadyAt: new Date(expectedReadyAt!),
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
              mobileNumber: true,
              collegeId: true,
            },
          },
        },
      });

      return res.status(200).json({ order: updatedOrder });
    }

    if (action === 'mark_ready') {
      // Generate 4-digit numeric OTP
      const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const hashedOtp = await bcrypt.hash(plainOtp, 10);
      const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const now = new Date();

      const updatedOrder = await prisma.$transaction(async (tx) => {
        // NOTE: collectionOtpPlain is stored temporarily alongside the bcrypt hash collectionOtp
        // so students can view the OTP on their tracking page before SMS notification (Phase 3).
        // IMPORTANT: Once an order transitions to COLLECTED in the future /collect endpoint,
        // collectionOtpPlain MUST be immediately nulled out for security.
        const updated = await tx.order.update({
          where: { id },
          data: {
            status: 'READY',
            actualReadyAt: now,
            collectionOtp: hashedOtp,
            collectionOtpPlain: plainOtp,
            otpExpiresAt,
          },
          include: {
            student: {
              select: {
                name: true,
                email: true,
                mobileNumber: true,
                collegeId: true,
              },
            },
          },
        });

        // Log transition: PROCESSING -> READY
        await logStatusChange({
          orderId: id,
          fromStatus: 'PROCESSING',
          toStatus: 'READY',
          changedById: staffId,
          tx,
        });

        return updated;
      });

      return res.status(200).json({
        order: updatedOrder,
        collectionOtp: plainOtp,
      });
    }
  } catch (error) {
    next(error);
  }
};

const bulkUpdateStatusSchema = z.object({
  orderIds: z
    .array(z.string().min(1, 'Order ID cannot be empty'))
    .min(1, 'orderIds array must contain at least one order ID'),
  action: z.enum(['mark_ready']),
});

export const bulkUpdateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const staffId = authReq.user?.id;

    if (!staffId) {
      const error = new Error('Unauthorized: Staff ID not found in token') as AppError;
      error.status = 401;
      throw error;
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.active) {
      const error = new Error('Unauthorized: Staff record not found or inactive') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = bulkUpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { action } = parsed.data;
    // Deduplicate input IDs
    const orderIds = Array.from(new Set(parsed.data.orderIds));

    // Fetch all requested orders
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const ordersById = new Map(orders.map((o) => [o.id, o]));

    type SucceededItem = {
      orderId: string;
      orderCode: string;
      bagNumber: string;
      studentName?: string;
      otp: string;
    };

    type FailedItem = {
      orderId: string;
      orderCode?: string;
      bagNumber?: string;
      reason: string;
    };

    const eligibleOrders: {
      order: (typeof orders)[0];
      plainOtp: string;
      hashedOtp: string;
    }[] = [];
    const failed: FailedItem[] = [];

    // Pre-validate orders and generate OTPs
    for (const id of orderIds) {
      const order = ordersById.get(id);
      if (!order) {
        failed.push({
          orderId: id,
          reason: 'Order not found',
        });
        continue;
      }

      if (order.status !== 'PROCESSING') {
        failed.push({
          orderId: id,
          orderCode: order.orderCode,
          bagNumber: order.bagNumber,
          reason: `Invalid status '${order.status}'. Order must be in PROCESSING status to be marked ready.`,
        });
        continue;
      }

      const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const hashedOtp = await bcrypt.hash(plainOtp, 10);

      eligibleOrders.push({
        order,
        plainOtp,
        hashedOtp,
      });
    }

    const now = new Date();
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const succeeded: SucceededItem[] = [];

    if (eligibleOrders.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of eligibleOrders) {
          const { order, plainOtp, hashedOtp } = item;

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'READY',
              actualReadyAt: now,
              collectionOtp: hashedOtp,
              collectionOtpPlain: plainOtp,
              otpExpiresAt,
            },
          });

          await logStatusChange({
            orderId: order.id,
            fromStatus: 'PROCESSING',
            toStatus: 'READY',
            changedById: staffId,
            tx,
          });

          succeeded.push({
            orderId: order.id,
            orderCode: order.orderCode,
            bagNumber: order.bagNumber,
            studentName: order.student?.name,
            otp: plainOtp,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      action,
      summary: {
        totalRequested: orderIds.length,
        succeededCount: succeeded.length,
        failedCount: failed.length,
      },
      succeeded,
      failed,
    });
  } catch (error) {
    next(error);
  }
};

export const searchOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const trimmedQuery = typeof q === 'string' ? q.trim() : '';

    const whereClause: any = {
      status: 'READY',
    };

    if (trimmedQuery.length > 0) {
      whereClause.OR = [
        { bagNumber: { contains: trimmedQuery, mode: 'insensitive' } },
        { orderCode: { contains: trimmedQuery, mode: 'insensitive' } },
        {
          student: {
            collegeId: { contains: trimmedQuery, mode: 'insensitive' },
          },
        },
        {
          student: {
            mobileNumber: { contains: trimmedQuery },
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderCode: true,
        bagNumber: true,
        status: true,
        actualReadyAt: true,
        collectionOtpPlain: true,
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        actualReadyAt: 'desc',
      },
    });

    return res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
};

const collectOrderSchema = z
  .object({
    otp: z.string().optional(),
    adminPin: z.string().optional(),
    returnedCount: z.number().int().min(0, 'Returned count must be a non-negative integer').optional(),
  })
  .refine(
    (data) => (data.otp && data.otp.trim().length > 0) || (data.adminPin && data.adminPin.trim().length > 0),
    {
      message: 'Either OTP or Admin PIN must be provided',
      path: ['otp'],
    }
  );

export const collectOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const authReq = req as AuthenticatedRequest;
    const staffId = authReq.user?.id;

    if (!staffId) {
      const error = new Error('Unauthorized: Staff ID not found in token') as AppError;
      error.status = 401;
      throw error;
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.active) {
      const error = new Error('Unauthorized: Staff record not found or inactive') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = collectOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { otp, adminPin, returnedCount } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            mobileNumber: true,
            collegeId: true,
          },
        },
      },
    });

    if (!order) {
      const error = new Error('Order not found') as AppError;
      error.status = 404;
      throw error;
    }

    if (order.status !== 'READY') {
      const error = new Error(
        `Invalid status transition: Order is currently ${order.status}. Only orders with status READY can be collected.`
      ) as AppError;
      error.status = 400;
      throw error;
    }

    let isOverride = false;
    const configuredAdminPin = process.env.ADMIN_PIN;

    if (adminPin && adminPin.trim().length > 0) {
      // Admin PIN override flow
      if (!configuredAdminPin || adminPin.trim() !== configuredAdminPin.trim()) {
        const error = new Error('Invalid Admin PIN') as AppError;
        error.status = 401;
        throw error;
      }
      isOverride = true;
    } else {
      // Standard OTP flow
      if (!otp || otp.trim().length === 0) {
        const error = new Error('OTP is required when Admin PIN is not provided') as AppError;
        error.status = 400;
        throw error;
      }

      if (!order.collectionOtp) {
        const error = new Error('No OTP found for this order. Please regenerate OTP.') as AppError;
        error.status = 400;
        throw error;
      }

      const isOtpValid = await bcrypt.compare(otp.trim(), order.collectionOtp);
      if (!isOtpValid) {
        const error = new Error('Invalid OTP') as AppError;
        error.status = 401;
        throw error;
      }
    }

    const noteParts: string[] = [];
    if (isOverride) {
      noteParts.push('Collected via ADMIN PIN OVERRIDE - OTP was bypassed');
    }
    if (returnedCount !== undefined && order.verifiedCount !== null && order.verifiedCount !== returnedCount) {
      noteParts.push(`Returned count mismatch: verified ${order.verifiedCount} vs returned ${returnedCount}`);
    }
    const note = noteParts.length > 0 ? noteParts.join('. ') : undefined;

    const now = new Date();

    const finalizedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'COLLECTED',
          returnedCount,
          collectedAt: now,
          collectionOtpPlain: null, // Clear plaintext OTP once collected
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
              mobileNumber: true,
              collegeId: true,
            },
          },
        },
      });

      // Log transition: READY -> COLLECTED
      await logStatusChange({
        orderId: id,
        fromStatus: 'READY',
        toStatus: 'COLLECTED',
        changedById: staffId,
        note,
        tx,
      });

      return updated;
    });

    return res.status(200).json({ order: finalizedOrder });
  } catch (error) {
    next(error);
  }
};


