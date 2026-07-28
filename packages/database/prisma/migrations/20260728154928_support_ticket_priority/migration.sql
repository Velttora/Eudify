-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "is_priority" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "support_tickets_is_priority_created_at_idx" ON "support_tickets"("is_priority", "created_at");
