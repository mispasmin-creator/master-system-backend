const { prisma } = require('../src/config/db');

async function backfill() {
  console.log('Starting backfill for missing ProductionOrder records...');

  try {
    const pendingCheckDeliveries = await prisma.orderCheckDelivery.findMany({
      where: {
        inStockOrNot: 'For Production Planning',
      },
      include: {
        receipt: {
          include: {
            checkPo: true,
          },
        },
      },
    });

    console.log(`Found ${pendingCheckDeliveries.length} OrderCheckDelivery records with inStockOrNot = 'For Production Planning'.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const cd of pendingCheckDeliveries) {
      if (!cd.receiptId || !cd.receipt) {
        console.log(`Skipping OrderCheckDelivery ID ${cd.id}: No receiptId or receipt found.`);
        skippedCount++;
        continue;
      }

      const existingProdOrder = await prisma.productionOrder.findUnique({
        where: { receiptId: cd.receiptId },
      });

      if (existingProdOrder) {
        console.log(`Skipping receiptId ${cd.receiptId}: ProductionOrder already exists (ID: ${existingProdOrder.id}).`);
        skippedCount++;
        continue;
      }

      const receipt = cd.receipt;
      const expectedDeliveryDate = receipt.checkPo?.expectedDeliveryDate || receipt.expectedDeliveryDate || null;

      const newProdOrder = await prisma.productionOrder.create({
        data: {
          receiptId: receipt.id,
          deliveryOrderNo: receipt.doNumber || null,
          firmName: receipt.firmName || null,
          partyName: receipt.partyName || null,
          productName: receipt.productName || null,
          orderQuantity: receipt.quantity != null ? Number(receipt.quantity) : null,
          expectedDeliveryDate,
          crmName: receipt.crmForCustomer || null,
          status: 'Pending',
        },
      });

      console.log(`Created ProductionOrder ID ${newProdOrder.id} for receiptId ${receipt.id} (DO: ${receipt.doNumber}, Product: ${receipt.productName}).`);
      createdCount++;
    }

    console.log(`Backfill finished. Created: ${createdCount}, Skipped/Existing: ${skippedCount}`);
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
