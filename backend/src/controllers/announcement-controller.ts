import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../middlewares/error-handler';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';

// Pagination schema matches existing convention
const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

// Zod schemas for request validation
const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  body: z.string().min(1, 'Body cannot be empty').optional(),
  isActive: z.boolean().optional(),
});

// Student-facing: Get active announcements
export const getStudentAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const whereClause = { isActive: true };

    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: {
            select: { name: true, role: true }
          }
        }
      }),
      prisma.announcement.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      announcements,
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

// Admin-facing: Get all announcements
export const getAdminAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Admin sees all announcements (active and inactive)
    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: {
            select: { name: true, role: true }
          }
        }
      }),
      prisma.announcement.count()
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      announcements,
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

// Admin-facing: Create a new announcement
export const createAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user?.id;

    if (!adminId) {
      const error = new Error('Unauthorized') as AppError;
      error.status = 401;
      throw error;
    }

    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { title, body } = parsed.data;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        createdById: adminId,
        isActive: true, // defaults to true per schema, but explicitly setting it here
      },
      include: {
        createdBy: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    next(error);
  }
};

// Admin-facing: Update an announcement
export const updateAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    // Verify announcement exists First
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error('Announcement not found') as AppError;
      error.status = 404;
      throw error;
    }

    const { title, body, isActive } = parsed.data;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        createdBy: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(200).json({
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    next(error);
  }
};
