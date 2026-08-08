-- CreateTable
CREATE TABLE "rmsales_party" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "firm_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MT',
    "available_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_inventory" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "available_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sold_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_order" (
    "id" SERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "firm_name" TEXT NOT NULL,
    "party_name" TEXT NOT NULL,
    "product_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "transport_type" TEXT NOT NULL,
    "dispatch_date" TIMESTAMP(3) NOT NULL,
    "po_copy_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending Approval',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_logistics" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "transporter_name" TEXT NOT NULL,
    "truck_no" TEXT NOT NULL,
    "bilty_no" TEXT NOT NULL,
    "actual_truck_qty" DOUBLE PRECISION NOT NULL,
    "bilty_copy_url" TEXT,
    "rate_type" TEXT NOT NULL,
    "rate_value" DOUBLE PRECISION NOT NULL,
    "freight_amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_logistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_invoice" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "invoice_copy_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rmsales_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmsales_activity_log" (
    "id" SERIAL NOT NULL,
    "user_role" TEXT,
    "user_name" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rmsales_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_party_name_key" ON "rmsales_party"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_product_name_key" ON "rmsales_product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_inventory_product_id_key" ON "rmsales_inventory"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_order_order_no_key" ON "rmsales_order"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_logistics_order_id_key" ON "rmsales_logistics"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_invoice_order_id_key" ON "rmsales_invoice"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "rmsales_invoice_invoice_no_key" ON "rmsales_invoice"("invoice_no");

-- AddForeignKey
ALTER TABLE "rmsales_inventory" ADD CONSTRAINT "rmsales_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "rmsales_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rmsales_order" ADD CONSTRAINT "rmsales_order_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "rmsales_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rmsales_logistics" ADD CONSTRAINT "rmsales_logistics_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "rmsales_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rmsales_invoice" ADD CONSTRAINT "rmsales_invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "rmsales_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
