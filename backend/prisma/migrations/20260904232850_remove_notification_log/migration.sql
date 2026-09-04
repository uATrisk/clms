/*
  Warnings:

  - You are about to drop the `notifications_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "notifications_log" DROP CONSTRAINT "notifications_log_order_id_fkey";

-- DropTable
DROP TABLE "notifications_log";

-- DropEnum
DROP TYPE "NotificationChannel";
