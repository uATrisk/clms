import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  req.log.error(err);

  res.status(status).json({
    error: {
      message,
      ...(err.errors ? { details: err.errors } : {})
    }
  });
};
