import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../index';
import { generateOrderCode } from '../utils/generate-code';
import { logStatusChange } from '../utils/status-logger';
import { AppError } from '../middlewares/error-handler';

const orderSubmissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional(),
  collegeId: z.string().optional(),
  bagNumber: z.string().min(1, 'Bag number is required'),
  mobileNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Valid mobile number required'),
  selfReportedCount: z.number().int().positive('Item count must be a positive integer')
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

    const { name, email, collegeId, bagNumber, mobileNumber, selfReportedCount } = parsed.data;

    // Check if student exists by bagNumber + mobileNumber, or create a new student record
    let student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          { bagNumber, mobileNumber }
        ]
      }
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          name,
          email: email || `${bagNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@rishihood.edu.in`,
          collegeId: collegeId || null,
          bagNumber,
          mobileNumber
        }
      });
    } else {
      // Update name/collegeId if changed
      student = await prisma.student.update({
        where: { id: student.id },
        data: {
          name,
          ...(collegeId ? { collegeId } : {}),
          ...(email ? { email } : {})
        }
      });
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

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderCode,
        studentId: student.id,
        bagNumber,
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

    // Mask phone number for privacy on public tracking page (e.g. +91 ******3210)
    const phone = order.student.mobileNumber;
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
