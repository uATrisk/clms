import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
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
