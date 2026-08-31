import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { Prisma } from '@prisma/client';

export const getStaffList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ staff });
  } catch (error) {
    next(error);
  }
};

const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['WASHER', 'COLLECTION', 'ADMIN'], {
    message: 'Role must be WASHER, COLLECTION, or ADMIN',
  }),
});

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { name, username, password, role } = parsed.data;

    const existingUser = await prisma.staff.findUnique({
      where: { username },
    });

    if (existingUser) {
      const error = new Error('Username already exists') as AppError;
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newStaff = await prisma.staff.create({
      data: {
        name,
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(201).json({ staff: newStaff });
  } catch (error) {
    next(error);
  }
};

const updateStaffActiveStatusSchema = z.object({
  active: z.boolean({
    message: 'active boolean is required',
  }),
});

export const updateStaffActiveStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const authReq = req as AuthenticatedRequest;
    const requestingAdminId = authReq.user?.id;

    if (!requestingAdminId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = updateStaffActiveStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { active } = parsed.data;

    if (id === requestingAdminId && !active) {
      const error = new Error('Admins cannot deactivate their own account') as AppError;
      error.status = 400;
      throw error;
    }

    const staffMember = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staffMember) {
      const error = new Error('Staff member not found') as AppError;
      error.status = 404;
      throw error;
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        role: true,
        username: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(200).json({ staff: updatedStaff });
  } catch (error) {
    next(error);
  }
};

const getOrdersListSchema = z.object({
  status: z
    .enum([
      'SUBMITTED',
      'ACCEPTED',
      'PROCESSING',
      'DELAYED',
      'READY',
      'COLLECTED',
      'COMPLAINT_RAISED',
      'UNDER_REVIEW',
      'RESOLVED',
      'CANCELLED',
    ])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
});

export const getOrdersList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = getOrdersListSchema.safeParse(req.query);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { status, startDate, endDate, page, limit } = parsed.data;

    const whereClause: Prisma.OrderWhereInput = {};

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.submittedAt = {};
      if (startDate) {
        whereClause.submittedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.submittedAt.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              name: true,
              email: true,
              bagNumber: true,
              mobileNumber: true,
              collegeId: true,
            },
          },
          assignedWasher: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Turnaround Time
    const collectedOrders = await prisma.order.findMany({
      where: {
        status: 'COLLECTED',
        collectedAt: { not: null },
      },
      select: {
        submittedAt: true,
        collectedAt: true,
      },
    });

    let totalHours = 0;
    for (const order of collectedOrders) {
      if (order.collectedAt) {
        const diffMs = order.collectedAt.getTime() - order.submittedAt.getTime();
        totalHours += diffMs / (1000 * 60 * 60);
      }
    }
    const averageHours =
      collectedOrders.length > 0
        ? Number((totalHours / collectedOrders.length).toFixed(2))
        : 0;

    // 2. Peak Submission Hours
    // Note: uses UTC/server time for hour extraction as requested
    const allOrdersSubmissionTimes = await prisma.order.findMany({
      select: { submittedAt: true },
    });
    const peakSubmissionHours = new Array(24).fill(0);
    for (const order of allOrdersSubmissionTimes) {
      const hour = order.submittedAt.getUTCHours();
      peakSubmissionHours[hour]++;
    }

    // 3. Status Breakdown
    const statusCountsResult = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });
    const statusBreakdown: Record<string, number> = {
      SUBMITTED: 0,
      ACCEPTED: 0,
      PROCESSING: 0,
      DELAYED: 0,
      READY: 0,
      COLLECTED: 0,
      COMPLAINT_RAISED: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      CANCELLED: 0,
    };
    for (const item of statusCountsResult) {
      statusBreakdown[item.status] = item._count._all;
    }

    // 4. Complaint Frequency
    const complaintCountsResult = await prisma.complaint.groupBy({
      by: ['category'],
      _count: {
        _all: true,
      },
    });
    const complaintFrequency: Record<string, number> = {
      MISSING: 0,
      DAMAGED: 0,
      WRONG_COUNT: 0,
      WRONG_BAG: 0,
      NOT_READY: 0,
      OTHER: 0,
    };
    for (const item of complaintCountsResult) {
      complaintFrequency[item.category] = item._count._all;
    }

    // 5. Count Mismatch Rate
    const [totalAcceptedOrLater, mismatchedCount] = await Promise.all([
      prisma.order.count({
        where: {
          status: {
            notIn: ['SUBMITTED', 'CANCELLED'],
          },
        },
      }),
      prisma.order.count({
        where: {
          status: {
            notIn: ['SUBMITTED', 'CANCELLED'],
          },
          countMismatchFlag: true,
        },
      }),
    ]);
    const mismatchPercentage =
      totalAcceptedOrLater > 0
        ? Number(((mismatchedCount / totalAcceptedOrLater) * 100).toFixed(2))
        : 0;

    res.status(200).json({
      turnaroundTime: {
        averageHours,
        orderCount: collectedOrders.length,
      },
      peakSubmissionHours,
      statusBreakdown,
      complaintFrequency,
      countMismatchRate: {
        percentage: mismatchPercentage,
        mismatched: mismatchedCount,
        total: totalAcceptedOrLater,
      },
    });
  } catch (error) {
    next(error);
  }
};
