import { OrderStatus } from '@prisma/client';
import { prisma } from '../index';

export const logStatusChange = async ({
  orderId,
  fromStatus,
  toStatus,
  changedById,
  note
}: {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById?: string;
  note?: string;
}) => {
  return await prisma.statusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      ...(changedById ? { changedById } : {}),
      ...(note ? { note } : {})
    }
  });
};
