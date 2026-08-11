const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  getRawMaterialReceipts,
  getProductionConsumption,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
} = require('./inventorySync.service');
const { finishedGoodCurrentLevel } = require('./inventoryFormulas');

/**
 * Captures a daily stock snapshot for a specific IST date.
 * Upserts snapshot records into InventoryRawMaterialHistory and InventoryFinishedGoodsHistory.
 *
 * @param {string|Date} targetDate Date string (YYYY-MM-DD) or Date object
 */
async function captureSnapshot(targetDate = new Date()) {
  const snapshotDateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  // Normalize time to midnight UTC for snapshotDate unique constraint consistency
  snapshotDateObj.setUTCHours(0, 0, 0, 0);

  const dateStr = snapshotDateObj.toISOString().split('T')[0];
  console.log(`[DailySnapshot] Starting stock snapshot for IST day: ${dateStr}`);

  // 1. Raw Materials Snapshot
  const [rawMaterials, liveReceipts, liveConsumptions] = await Promise.all([
    prisma.inventoryRawMaterial.findMany(),
    getRawMaterialReceipts(''),
    getProductionConsumption(''),
  ]);

  let rmSnapshotCount = 0;
  for (const item of rawMaterials) {
    const normKey = item.itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const purchaseQty = liveReceipts[normKey]?.quantity || 0;
    const consumptionQty = liveConsumptions[normKey]?.quantity || 0;

    // Calculate actual level: opStock + receipts - consumption
    const calculatedLevel = (item.opStock || 0) + purchaseQty - consumptionQty;
    const finalLevel = item.actualLevel !== undefined ? item.actualLevel : Math.max(0, calculatedLevel);

    await prisma.inventoryRawMaterialHistory.upsert({
      where: {
        snapshotDate_firmName_itemName: {
          snapshotDate: snapshotDateObj,
          firmName: item.firmName,
          itemName: item.itemName,
        },
      },
      update: {
        unit: item.unit || '',
        actualLevel: finalLevel,
        capturedAt: new Date(),
      },
      create: {
        snapshotDate: snapshotDateObj,
        firmName: item.firmName,
        itemName: item.itemName,
        unit: item.unit || '',
        actualLevel: finalLevel,
      },
    });
    rmSnapshotCount++;
  }

  // 2. Finished Goods Snapshot
  const [finishedGoods, liveProduction, liveDispatches, livePending, liveMatReturns, livePurchReturns] =
    await Promise.all([
      prisma.inventoryFinishedGoods.findMany(),
      getFinishedGoodProduction(''),
      getFinishedGoodDispatch(''),
      getFinishedGoodPendingOrders(''),
      getMaterialReturns(''),
      getPurchaseReturns(''),
    ]);

  let fgSnapshotCount = 0;
  for (const fg of finishedGoods) {
    const normKey = fg.productName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const prodQty = liveProduction[normKey]?.quantityFg || fg.production || 0;
    const salesQty = liveDispatches[normKey]?.quantity || fg.sales || 0;
    const salesRetQty = liveMatReturns[normKey]?.quantity || fg.salesReturn || 0;
    const purchRetQty = livePurchReturns[normKey]?.quantity || fg.purchaseReturn || 0;

    const calcLevel = finishedGoodCurrentLevel(
      fg.opStock,
      fg.purchaseMaterialReceived,
      prodQty,
      fg.stockAdjustment,
      salesQty,
      salesRetQty,
      fg.consumption,
      purchRetQty
    );

    const finalLevel = fg.currentLevel !== undefined ? fg.currentLevel : calcLevel;

    await prisma.inventoryFinishedGoodsHistory.upsert({
      where: {
        snapshotDate_firmName_productName: {
          snapshotDate: snapshotDateObj,
          firmName: fg.firmName,
          productName: fg.productName,
        },
      },
      update: {
        currentLevel: finalLevel,
        capturedAt: new Date(),
      },
      create: {
        snapshotDate: snapshotDateObj,
        firmName: fg.firmName,
        productName: fg.productName,
        currentLevel: finalLevel,
      },
    });
    fgSnapshotCount++;
  }

  console.log(
    `[DailySnapshot] Completed snapshot for ${dateStr}. RawMaterial rows: ${rmSnapshotCount}, FinishedGoods rows: ${fgSnapshotCount}`
  );

  return {
    snapshotDate: dateStr,
    rawMaterialCount: rmSnapshotCount,
    finishedGoodsCount: fgSnapshotCount,
  };
}

module.exports = {
  captureSnapshot,
};
