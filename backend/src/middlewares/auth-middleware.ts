import { Request, Response, NextFunction } from 'express';
import { StaffRole } from '@prisma/client';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { AppError } from './error-handler';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authentication required') as AppError;
      error.status = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const err = new Error('Invalid or expired token') as AppError;
    err.status = 401;
    next(err);
  }
};

export const authorize = (allowedRoles: (StaffRole | 'STUDENT')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error('Forbidden: Insufficient permissions') as AppError;
      error.status = 403;
      return next(error);
    }
    next();
  };
};
