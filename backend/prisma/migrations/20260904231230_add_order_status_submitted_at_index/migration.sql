-- CreateIndex
CREATE INDEX "orders_status_submitted_at_idx" ON "orders"("status", "submitted_at");
