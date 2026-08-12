-- AlterTable
ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "receipt_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "production_orders_receipt_id_key" ON "production_orders"("receipt_id");

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "order_receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
