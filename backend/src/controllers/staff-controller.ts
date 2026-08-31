import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { logStatusChange } from '../utils/status-logger';

export const getOrdersQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'SUBMITTED',
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
        submittedAt: 'asc',
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
