import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../index';

export const logStatusChange = async ({
  orderId,
  fromStatus,
  toStatus,
  changedById,
  note,
  tx,
}: {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById?: string;
  note?: string;
  tx?: Prisma.TransactionClient;
}) => {
  const client = tx || prisma;
  return await client.statusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      ...(changedById ? { changedById } : {}),
      ...(note ? { note } : {}),
    },
  });
};
