import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.id;

    if (!studentId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        bagNumber: true,
        mobileNumber: true,
        collegeId: true,
        createdAt: true,
      },
    });

    if (!student) {
      const error = new Error('Student profile not found') as AppError;
      error.status = 404;
      throw error;
    }

    res.status(200).json({ student });
  } catch (error) {
    next(error);
  }
};

const updateProfileSchema = z.object({
  bagNumber: z.string().trim().min(1, 'Bag number is required'),
  mobileNumber: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Valid mobile number required'),
  collegeId: z.string().trim().optional().nullable(),
});

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.id;

    if (!studentId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { bagNumber, mobileNumber, collegeId } = parsed.data;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        bagNumber,
        mobileNumber,
        collegeId: collegeId !== undefined ? collegeId : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bagNumber: true,
        mobileNumber: true,
        collegeId: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      student,
    });
  } catch (error) {
    next(error);
  }
};
