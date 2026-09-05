import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../db';
import { generateOrderCode } from '../utils/generate-code';
import { logStatusChange } from '../utils/status-logger';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';

const orderSubmissionSchema = z.object({
  selfReportedCount: z.number().int().positive('Item count must be a positive integer')
});

const raiseComplaintSchema = z.object({
  category: z.enum(['MISSING', 'DAMAGED', 'WRONG_COUNT', 'WRONG_BAG', 'NOT_READY', 'OTHER']),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

export const submitOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = orderSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { selfReportedCount } = parsed.data;
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.id;

    if (!studentId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    // Fetch the student's own record from the database
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      const error = new Error('Student record not found') as AppError;
      error.status = 404;
      throw error;
    }

    // Check profile completeness
    if (!student.bagNumber || !student.bagNumber.trim() || !student.mobileNumber || !student.mobileNumber.trim() || !student.gender) {
      const error = new Error('Please complete your profile before submitting laundry') as AppError;
      error.status = 400;
      throw error;
    }

    // Check if the student already has an active order (status NOT IN COLLECTED, CANCELLED)
    const existingActiveOrder = await prisma.order.findFirst({
      where: {
        studentId: student.id,
        status: {
          notIn: [OrderStatus.COLLECTED, OrderStatus.CANCELLED]
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    if (existingActiveOrder) {
      const error = new Error(
        `You already have an active laundry request (Order #${existingActiveOrder.orderCode}, status: ${existingActiveOrder.status}). Please wait until it's collected before submitting a new one.`
      ) as AppError;
      error.status = 409;
      error.errors = {
        orderCode: existingActiveOrder.orderCode,
        status: existingActiveOrder.status
      };
      throw error;
    }

    // Generate unique order code
    let orderCode = generateOrderCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existing = await prisma.order.findUnique({
        where: { orderCode }
      });
      if (!existing) {
        isCodeUnique = true;
      } else {
        orderCode = generateOrderCode();
      }
    }

    // Create the order using student's saved bagNumber and studentId
    const order = await prisma.order.create({
      data: {
        orderCode,
        studentId: student.id,
        bagNumber: student.bagNumber,
        selfReportedCount,
        status: OrderStatus.SUBMITTED
      },
      include: {
        student: true
      }
    });

    // Record status history
    await logStatusChange({
      orderId: order.id,
      fromStatus: null,
      toStatus: OrderStatus.SUBMITTED,
      note: 'Order submitted by student'
    });

    res.status(201).json({
      message: 'Order submitted successfully',
      order: {
        id: order.id,
        orderCode: order.orderCode,
        bagNumber: order.bagNumber,
        selfReportedCount: order.selfReportedCount,
        status: order.status,
        submittedAt: order.submittedAt,
        student: {
          name: order.student.name,
          mobileNumber: order.student.mobileNumber,
          collegeId: order.student.collegeId
        }
      },
      trackUrl: `/track/${order.orderCode}`
    });
  } catch (error) {
    next(error);
  }
};

export const trackOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderCode = req.params.orderCode as string;
    const authReq = req as AuthenticatedRequest;

    if (!orderCode) {
      const error = new Error('Order code is required') as AppError;
      error.status = 400;
      throw error;
    }

    const order = await prisma.order.findUnique({
      where: { orderCode },
      include: {
        student: {
          select: {
            name: true,
            bagNumber: true,
            collegeId: true,
            mobileNumber: true
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          select: {
            fromStatus: true,
            toStatus: true,
            changedAt: true,
            note: true
          }
        },
        complaints: {
          select: {
            id: true,
            category: true,
            description: true,
            status: true,
            raisedAt: true,
            resolvedAt: true,
            resolutionNote: true
          }
        }
      }
    });

    if (!order) {
      const error = new Error('Order not found with the provided code') as AppError;
      error.status = 404;
      throw error;
    }

    // Access control: if user is STUDENT, they can only view their own
    if (authReq.user && authReq.user.role === 'STUDENT') {
      if (order.studentId !== authReq.user.id) {
        const error = new Error('Forbidden: Cannot track another student\'s order') as AppError;
        error.status = 403;
        throw error;
      }
    }

    // Mask phone number for privacy on tracking page
    const phone = order.student.mobileNumber || '';
    const maskedMobile = phone.length > 4
      ? phone.slice(0, 3) + '*'.repeat(phone.length - 7 > 0 ? phone.length - 7 : 3) + phone.slice(-4)
      : phone;

    res.status(200).json({
      order: {
        id: order.id,
        orderCode: order.orderCode,
        bagNumber: order.bagNumber,
        status: order.status,
        selfReportedCount: order.selfReportedCount,
        verifiedCount: order.verifiedCount,
        returnedCount: order.returnedCount,
        countMismatchFlag: order.countMismatchFlag,
        submittedAt: order.submittedAt,
        acceptedAt: order.acceptedAt,
        expectedReadyAt: order.expectedReadyAt,
        actualReadyAt: order.actualReadyAt,
        collectedAt: order.collectedAt,
        collectionOtp: order.status === 'READY' ? order.collectionOtpPlain : undefined,
        student: {
          name: order.student.name,
          bagNumber: order.student.bagNumber,
          collegeId: order.student.collegeId,
          maskedMobile
        },
        timeline: order.statusHistory,
        complaints: order.complaints
      }
    });
  } catch (error) {
    next(error);
  }
};

export const raiseComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderCode = req.params.orderCode as string;
    const authReq = req as AuthenticatedRequest;

    if (!orderCode) {
      const error = new Error('Order code is required') as AppError;
      error.status = 400;
      throw error;
    }

    const parsed = raiseComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { category, description } = parsed.data;

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { orderCode }
    });

    if (!order) {
      const error = new Error('Order not found with the provided code') as AppError;
      error.status = 404;
      throw error;
    }

    // Verify ownership: authenticated student must own the order
    if (order.studentId !== authReq.user?.id) {
      const error = new Error('Forbidden: Cannot raise a complaint for another student\'s order') as AppError;
      error.status = 403;
      throw error;
    }

    // Create the complaint in OPEN status (photoUrl left null for now)
    const complaint = await prisma.complaint.create({
      data: {
        orderId: order.id,
        category,
        description,
        status: 'OPEN'
      }
    });

    res.status(201).json({
      message: 'Complaint raised successfully',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

export const getMyActiveOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.id;

    if (!studentId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        studentId,
        status: {
          notIn: [OrderStatus.COLLECTED, OrderStatus.CANCELLED]
        }
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: {
          select: {
            name: true,
            bagNumber: true,
            collegeId: true,
            mobileNumber: true
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          select: {
            fromStatus: true,
            toStatus: true,
            changedAt: true,
            note: true
          }
        },
        complaints: {
          select: {
            id: true,
            category: true,
            description: true,
            status: true,
            raisedAt: true,
            resolvedAt: true,
            resolutionNote: true
          }
        }
      }
    });

    if (!activeOrder) {
      const error = new Error('No active order found') as AppError;
      error.status = 404;
      throw error;
    }

    const phone = activeOrder.student.mobileNumber || '';
    const maskedMobile = phone.length > 4
      ? phone.slice(0, 3) + '*'.repeat(phone.length - 7 > 0 ? phone.length - 7 : 3) + phone.slice(-4)
      : phone;

    res.status(200).json({
      order: {
        id: activeOrder.id,
        orderCode: activeOrder.orderCode,
        bagNumber: activeOrder.bagNumber,
        status: activeOrder.status,
        selfReportedCount: activeOrder.selfReportedCount,
        verifiedCount: activeOrder.verifiedCount,
        returnedCount: activeOrder.returnedCount,
        countMismatchFlag: activeOrder.countMismatchFlag,
        submittedAt: activeOrder.submittedAt,
        acceptedAt: activeOrder.acceptedAt,
        expectedReadyAt: activeOrder.expectedReadyAt,
        actualReadyAt: activeOrder.actualReadyAt,
        collectedAt: activeOrder.collectedAt,
        collectionOtp: activeOrder.status === 'READY' ? activeOrder.collectionOtpPlain : undefined,
        student: {
          name: activeOrder.student.name,
          bagNumber: activeOrder.student.bagNumber,
          collegeId: activeOrder.student.collegeId,
          maskedMobile
        },
        timeline: activeOrder.statusHistory,
        complaints: activeOrder.complaints
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrderHistorySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

export const getMyOrderHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.id;

    if (!studentId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = getOrderHistorySchema.safeParse(req.query);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const whereClause = {
      studentId,
      status: {
        in: [OrderStatus.COLLECTED, OrderStatus.CANCELLED]
      }
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        include: {
          student: {
            select: {
              name: true,
              bagNumber: true,
              collegeId: true,
              mobileNumber: true
            }
          },
          statusHistory: {
            orderBy: { changedAt: 'asc' },
            select: {
              fromStatus: true,
              toStatus: true,
              changedAt: true,
              note: true
            }
          },
          complaints: {
            select: {
              id: true,
              category: true,
              description: true,
              status: true,
              raisedAt: true,
              resolvedAt: true,
              resolutionNote: true
            }
          }
        }
      }),
      prisma.order.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const formattedOrders = orders.map((order) => {
      const phone = order.student.mobileNumber || '';
      const maskedMobile = phone.length > 4
        ? phone.slice(0, 3) + '*'.repeat(phone.length - 7 > 0 ? phone.length - 7 : 3) + phone.slice(-4)
        : phone;

      return {
        id: order.id,
        orderCode: order.orderCode,
        bagNumber: order.bagNumber,
        status: order.status,
        selfReportedCount: order.selfReportedCount,
        verifiedCount: order.verifiedCount,
        returnedCount: order.returnedCount,
        countMismatchFlag: order.countMismatchFlag,
        submittedAt: order.submittedAt,
        acceptedAt: order.acceptedAt,
        expectedReadyAt: order.expectedReadyAt,
        actualReadyAt: order.actualReadyAt,
        collectedAt: order.collectedAt,
        student: {
          name: order.student.name,
          bagNumber: order.student.bagNumber,
          collegeId: order.student.collegeId,
          maskedMobile
        },
        timeline: order.statusHistory,
        complaints: order.complaints
      };
    });

    res.status(200).json({
      orders: formattedOrders,
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


