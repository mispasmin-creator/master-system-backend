-- CreateTable
CREATE TABLE "payment_request" (
    "id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "unique_number" TEXT,
    "fms_name" TEXT NOT NULL,
    "firm_name" TEXT NOT NULL,
    "pay_to" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "department" TEXT,
    "priority" TEXT,
    "remarks" TEXT,
    "attachment_url" TEXT,
    "supporting_documents" TEXT,
    "maker" TEXT,
    "checker" TEXT,
    "approver" TEXT,
    "planned_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "delay_days" DOUBLE PRECISION,
    "required_date" TIMESTAMP(3),
    "checker_remarks" TEXT,
    "approver_remarks" TEXT,
    "reason" TEXT,
    "approval_status" TEXT,
    "type_of_funding" TEXT,
    "funding_channel" TEXT,
    "funding_remarks" TEXT,
    "funding_actual" TIMESTAMP(3),
    "funding_delay" DOUBLE PRECISION,
    "funding_status" TEXT,
    "approval_actual" TIMESTAMP(3),
    "approval_stage_status" TEXT,
    "approval_stage_remarks" TEXT,
    "posting_planned" TIMESTAMP(3),
    "posting_actual" TIMESTAMP(3),
    "posting_delay" DOUBLE PRECISION,
    "posting_remarks" TEXT,
    "payment_mode" TEXT,
    "final_planned" TIMESTAMP(3),
    "final_actual" TIMESTAMP(3),
    "final_delay" DOUBLE PRECISION,
    "finance_remarks" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_history_entry" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "user_name" TEXT,
    "user_role" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_history_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_vendor" (
    "id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "vendor_type" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "mobile_number" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_fms_master" (
    "id" TEXT NOT NULL,
    "fms_name" TEXT NOT NULL,
    "firm_name" TEXT,
    "type_of_funding" TEXT,
    "payment_mode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_fms_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_request_payment_number_key" ON "payment_request"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vendor_vendor_name_key" ON "payment_vendor"("vendor_name");

-- AddForeignKey
ALTER TABLE "payment_history_entry" ADD CONSTRAINT "payment_history_entry_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
