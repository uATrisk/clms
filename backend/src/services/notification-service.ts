import { NotificationChannel } from '@prisma/client';
import { prisma } from '../index';

export interface NotificationAdapter {
  send(to: string, message: string): Promise<{ success: boolean; providerId?: string; error?: string }>;
}

export class ConsoleNotificationAdapter implements NotificationAdapter {
  async send(to: string, message: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const timestamp = new Date().toISOString();
    console.log(`[SMS to ${to}]: ${message}`);
    return {
      success: true,
      providerId: `console-${timestamp}`,
    };
  }
}

// Export a single configured instance that other parts of the app can use
export const notificationService: NotificationAdapter = new ConsoleNotificationAdapter();

/**
 * High-level helper to send a notification and log it to the database.
 * Does not throw immediately if the send fails, but rather logs the failure,
 * returning the sending result.
 */
export const sendNotification = async ({
  orderId,
  channel,
  to,
  message,
}: {
  orderId: string;
  channel: NotificationChannel;
  to: string;
  message: string;
}) => {
  let deliveryStatus: string;

  try {
    const result = await notificationService.send(to, message);

    if (result.success) {
      deliveryStatus = 'SENT';
    } else {
      deliveryStatus = `FAILED: ${result.error || 'Unknown error'}`;
    }
  } catch (err: any) {
    deliveryStatus = `FAILED: ${err.message || 'Exception caught'}`;
  }

  // Write record to notifications_log table
  await prisma.notificationLog.create({
    data: {
      orderId,
      channel,
      message,
      deliveryStatus,
    },
  });

  return { deliveryStatus };
};
