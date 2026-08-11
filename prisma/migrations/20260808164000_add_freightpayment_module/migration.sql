-- CreateTable
CREATE TABLE "freightpayment_entry" (
    "id" SERIAL NOT NULL,
    "payment_number" TEXT,
    "unique_number" TEXT NOT NULL,
    "firm_name" TEXT,
    "fms_name" TEXT,
    "transporter_name" TEXT,
    "vehicle_number" TEXT,
    "from_location" TEXT,
    "to_location" TEXT,
    "material_load_details" TEXT,
    "bilty_number" TEXT,
    "rate_type" TEXT,
    "amount" DOUBLE PRECISION,
    "posting_amount" DOUBLE PRECISION,
    "bilty_image_url" TEXT,
    "lift_id" TEXT,
    "party_name" TEXT,
    "billing_qty" DOUBLE PRECISION,
    "bill_number" TEXT,
    "batch_number" TEXT,
    "planned_at" TIMESTAMP(3),
    "actual_at" TIMESTAMP(3),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "freightpayment_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freightpayment_kitting" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Done',
    "remark" TEXT,
    "actual_at" TIMESTAMP(3),
    "next_planned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "freightpayment_kitting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freightpayment_audit" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Done',
    "amount" DOUBLE PRECISION,
    "remark" TEXT,
    "audit_image_url" TEXT,
    "batch_number" TEXT,
    "actual_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "freightpayment_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freightpayment_posting" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Done',
    "remark" TEXT,
    "batch_number" TEXT,
    "actual_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "freightpayment_posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freightpayment_release" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Done',
    "remark" TEXT,
    "transporter_bill_image_url" TEXT,
    "batch_number" TEXT,
    "actual_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "freightpayment_release_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "freightpayment_entry_unique_number_key" ON "freightpayment_entry"("unique_number");

-- CreateIndex
CREATE UNIQUE INDEX "freightpayment_kitting_entry_id_key" ON "freightpayment_kitting"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "freightpayment_audit_entry_id_key" ON "freightpayment_audit"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "freightpayment_posting_entry_id_key" ON "freightpayment_posting"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "freightpayment_release_entry_id_key" ON "freightpayment_release"("entry_id");

-- AddForeignKey
ALTER TABLE "freightpayment_kitting" ADD CONSTRAINT "freightpayment_kitting_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "freightpayment_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freightpayment_audit" ADD CONSTRAINT "freightpayment_audit_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "freightpayment_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freightpayment_posting" ADD CONSTRAINT "freightpayment_posting_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "freightpayment_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freightpayment_release" ADD CONSTRAINT "freightpayment_release_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "freightpayment_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
