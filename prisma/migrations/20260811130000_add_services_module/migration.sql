-- CreateTable
CREATE TABLE "service_offer" (
    "id" TEXT NOT NULL,
    "offer_no" TEXT NOT NULL,
    "firm_name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_offer" TEXT,
    "offer_copy" TEXT,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "service_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_job" (
    "id" TEXT NOT NULL,
    "service_no" TEXT NOT NULL,
    "offer_id" TEXT,
    "firm_name" TEXT NOT NULL,
    "checker" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" TEXT,
    "vendor" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "planned_1" TIMESTAMP(3),
    "actual_1" TIMESTAMP(3),
    "delay_1" DOUBLE PRECISION,
    "bill_no" TEXT,
    "bill_copy" TEXT,
    "planned_2" TIMESTAMP(3),
    "actual_2" TIMESTAMP(3),
    "delay_2" DOUBLE PRECISION,
    "payment_proof" TEXT,
    "planned_3" TIMESTAMP(3),
    "actual_3" TIMESTAMP(3),
    "delay_3" DOUBLE PRECISION,
    "status_3" TEXT,
    "remarks_3" TEXT,
    "planned_4" TIMESTAMP(3),
    "actual_4" TIMESTAMP(3),
    "delay_4" DOUBLE PRECISION,
    "status_4" TEXT,
    "remarks_4" TEXT,
    "planned_5" TIMESTAMP(3),
    "actual_5" TIMESTAMP(3),
    "delay_5" DOUBLE PRECISION,
    "status_5" TEXT,
    "remarks_5" TEXT,
    "payment_form" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Service Created',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "service_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_utility" (
    "id" TEXT NOT NULL,
    "utility_no" TEXT NOT NULL,
    "firm_name" TEXT NOT NULL,
    "person_name" TEXT,
    "user_name" TEXT,
    "department" TEXT,
    "group_head" TEXT,
    "pay_to" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bill_image" TEXT,
    "bill_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "remarks" TEXT,
    "tds_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending Approval',
    "planned_1" TIMESTAMP(3),
    "actual_1" TIMESTAMP(3),
    "delay_1" DOUBLE PRECISION,
    "planned_2" TIMESTAMP(3),
    "actual_2" TIMESTAMP(3),
    "delay_2" DOUBLE PRECISION,
    "payment_form_link" TEXT,
    "fms_name" TEXT,
    "details" TEXT,
    "approval_attachment" TEXT,
    "payment_no" TEXT,
    "payment_mode" TEXT,
    "transaction_ref" TEXT,
    "payment_date" TIMESTAMP(3),
    "payment_attachment" TEXT,
    "payment_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "service_utility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_master_dropdown" (
    "id" TEXT NOT NULL,
    "department" TEXT,
    "group_head" TEXT,
    "firm_name" TEXT,
    "fms_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_master_dropdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_offer_offer_no_key" ON "service_offer"("offer_no");

-- CreateIndex
CREATE UNIQUE INDEX "service_job_service_no_key" ON "service_job"("service_no");

-- CreateIndex
CREATE UNIQUE INDEX "service_utility_utility_no_key" ON "service_utility"("utility_no");

-- AddForeignKey
ALTER TABLE "service_job" ADD CONSTRAINT "service_job_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "service_offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
