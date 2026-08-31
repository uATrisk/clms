import jwt from 'jsonwebtoken';
import { StaffRole } from '@prisma/client';

export interface JwtPayload {
  id: string;
  role: StaffRole | 'STUDENT';
  email?: string; // Optional for students
}

export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
  return jwt.verify(token, secret) as JwtPayload;
};
