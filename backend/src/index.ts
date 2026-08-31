import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';

import { errorHandler } from './middlewares/error-handler';
import healthRouter from './routes/health-router';
import authRouter from './routes/auth-router';
import orderRouter from './routes/order-router';
import staffRouter from './routes/staff-router';
import adminRouter from './routes/admin-router';

// Load environment config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

export const prisma = new PrismaClient();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());

// Request logging with Pino
app.use(pinoHttp({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
}));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);
app.use('/api/staff', staffRouter);
app.use('/api/admin', adminRouter);

// Undefined routes handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
