const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeItemKey,
  getRawMaterialReceipts,
  getRawMaterialRates,
  getProductionConsumption,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getMaterialReturns,
  getPurchaseReturns,
  getStockAdjustmentTotals,
} = require('./inventorySync.service');
const { finishedGoodCurrentLevel, rawMaterialActualLevel } = require('./inventoryFormulas');

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
  const [rawMaterials, liveReceipts, liveRates, liveConsumptions, liveSales, livePurchReturnsRm, rmAdjustmentTotals] =
    await Promise.all([
      prisma.inventoryRawMaterial.findMany(),
      getRawMaterialReceipts(''),
      getRawMaterialRates(''),
      getProductionConsumption(''),
      getFinishedGoodDispatch(''),
      getPurchaseReturns(''),
      getStockAdjustmentTotals('raw_material'),
    ]);

  let rmSnapshotCount = 0;
  for (const item of rawMaterials) {
    const normKey = normalizeItemKey(item.itemName);
    const purchaseQty = liveReceipts[normKey]?.quantity || 0;
    const consumptionQty = liveConsumptions[normKey]?.quantity || 0;
    const salesQty = liveSales[normKey]?.quantity || 0;
    const purchReturnQty = livePurchReturnsRm[normKey]?.quantity || 0;
    const adjustmentQty = rmAdjustmentTotals[normKey] || 0;
    const liveRate = liveRates[normKey] || 0;

    const actualLevel = rawMaterialActualLevel(
      item.opStock,
      adjustmentQty,
      purchaseQty,
      consumptionQty,
      purchReturnQty,
      salesQty
    );

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
        actualLevel,
        optimumQty: item.optimumQty,
        maxQty: item.maxQty,
        productRate: liveRate,
        capturedAt: new Date(),
      },
      create: {
        snapshotDate: snapshotDateObj,
        firmName: item.firmName,
        itemName: item.itemName,
        unit: item.unit || '',
        actualLevel,
        optimumQty: item.optimumQty,
        maxQty: item.maxQty,
        productRate: liveRate,
      },
    });
    rmSnapshotCount++;
  }

  // 2. Finished Goods Snapshot
  const [
    finishedGoods,
    liveProduction,
    liveDispatches,
    liveMatReturns,
    livePurchReturns,
    liveReceiptsFg,
    liveConsumptionFg,
    fgAdjustmentTotals,
  ] = await Promise.all([
    prisma.inventoryFinishGoods.findMany(),
    getFinishedGoodProduction(''),
    getFinishedGoodDispatch(''),
    getMaterialReturns(''),
    getPurchaseReturns(''),
    getRawMaterialReceipts(''),
    getProductionConsumption(''),
    getStockAdjustmentTotals('finish_good'),
  ]);

  let fgSnapshotCount = 0;
  for (const fg of finishedGoods) {
    const normKey = normalizeItemKey(fg.productName);
    const prodQty = liveProduction[normKey]?.quantityFg || 0;
    const salesQty = liveDispatches[normKey]?.quantity || 0;
    const salesRetQty = liveMatReturns[normKey]?.quantity || 0;
    const purchRetQty = livePurchReturns[normKey]?.quantity || 0;
    const purchRecQty = liveReceiptsFg[normKey]?.quantity || 0;
    const consumptionQty = liveConsumptionFg[normKey]?.quantity || 0;
    const adjustmentQty = fgAdjustmentTotals[normKey] || 0;

    const calcLevel = finishedGoodCurrentLevel(
      fg.opStock,
      purchRecQty,
      prodQty,
      adjustmentQty,
      salesQty,
      salesRetQty,
      consumptionQty,
      purchRetQty
    );

    await prisma.inventoryFinishedGoodsHistory.upsert({
      where: {
        snapshotDate_firmName_productName: {
          snapshotDate: snapshotDateObj,
          firmName: fg.firmName,
          productName: fg.productName,
        },
      },
      update: {
        currentLevel: calcLevel,
        capturedAt: new Date(),
      },
      create: {
        snapshotDate: snapshotDateObj,
        firmName: fg.firmName,
        productName: fg.productName,
        currentLevel: calcLevel,
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
