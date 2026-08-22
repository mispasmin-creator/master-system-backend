-- AlterTable: crushing runs need a firm to be attributable to inventory
-- (the frontend already collects it — see Crushing.tsx's "Firm Name" field —
-- it was simply never persisted).
ALTER TABLE "production_crushing_runs" ADD COLUMN IF NOT EXISTS "firm_name" TEXT;
