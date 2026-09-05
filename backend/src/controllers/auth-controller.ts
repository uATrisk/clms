import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';
import { generateToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../middlewares/error-handler';
import { StaffRole } from '@prisma/client';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const googleAuthSchema = z.object({
  id_token: z.string().min(1, 'Google ID token is required')
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { username, password } = parsed.data;

    const staff = await prisma.staff.findUnique({
      where: { username }
    });

    if (!staff || !staff.active) {
      const error = new Error('Invalid username or password') as AppError;
      error.status = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid username or password') as AppError;
      error.status = 401;
      throw error;
    }

    const token = generateToken({ id: staff.id, role: staff.role });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: staff.id,
        name: staff.name,
        username: staff.username,
        role: staff.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation Error') as AppError;
      error.status = 400;
      error.errors = parsed.error.format();
      throw error;
    }

    const { id_token } = parsed.data;

    // Verify Google ID token
    const GoogleAuthClient = require('google-auth-library').OAuth2Client;
    const client = new GoogleAuthClient();

    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID || ''
      });
      payload = payload || ticket.getPayload();
    } catch (verifyErr: any) {
      console.error('Google ID token verification failed:', verifyErr.message);
      const error = new Error('Invalid Google ID token') as AppError;
      error.status = 401;
      throw error;
    }

    // Domain restriction: @rishihood.edu.in or subdomains (e.g. @nst.rishihood.edu.in)
    const email = payload?.email;
    const domain = email ? email.split('@')[1] : '';
    const isAllowed = domain === 'rishihood.edu.in' || domain.endsWith('.rishihood.edu.in');
    if (!isAllowed) {
      const error = new Error('Access denied: Only @rishihood.edu.in accounts are authorized') as AppError;
      error.status = 403;
      throw error;
    }

    // Find or create student based on verified email
    let student = await prisma.student.findUnique({
      where: { email }
    });

    if (!student) {
      // Create new student without a pre-assigned bag number (profile incomplete)
      student = await prisma.student.create({
        data: {
          name: payload?.name || 'Student',
          email: email!,
          collegeId: null, // To be filled during profile setup
          bagNumber: null, // To be filled during profile setup
          mobileNumber: payload?.phone_number || null, // Optional in Google profile, filled during setup
          createdAt: new Date()
        }
      });
      console.log(`New student created: ${student.email}`);
    }

    // Issue application JWT for student session
    const studentToken = generateToken({
      id: student.id,
      role: 'STUDENT' as any,
      email: student.email
    });

    res.status(200).json({
      message: 'Google authentication successful',
      token: studentToken,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        bagNumber: student.bagNumber,
        mobileNumber: student.mobileNumber,
        collegeId: student.collegeId,
        role: 'STUDENT'
      }
    });
  } catch (error) {
    next(error);
  }
};
