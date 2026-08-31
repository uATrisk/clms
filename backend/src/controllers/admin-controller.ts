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
