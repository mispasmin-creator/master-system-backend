-- AlterTable: Rebuild production_master columns
ALTER TABLE "production_master" DROP COLUMN IF EXISTS "category";
ALTER TABLE "production_master" DROP COLUMN IF EXISTS "value";

ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Priority" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Supervisor Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Shift" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Test Status" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Tested by" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Status" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Firm Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Material Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Flow Of Material" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "SF Supervisor Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Name Of Raw Material" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Finished Goods Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "Crushing Product Name" TEXT;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "production_master" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
