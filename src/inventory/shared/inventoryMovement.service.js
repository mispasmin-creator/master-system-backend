const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName } = require('./inventorySync.service');

// Old "category" values, still used by every caller of applyMovement(), map onto
// the real stock_adjustment.material_type enum.
const CATEGORY_TO_MATERIAL_TYPE = {
  RawMaterial: 'raw_material',
  FinishedGoods: 'finish_good',
  TradingMaterial: 'trading_material',
};

// Movement types that increase stock vs decrease it — mirrors the real
// stock_adjustment.status enum ('Factory +' / 'Factory -').
const INCREASING_MOVEMENTS = new Set(['RECEIPT', 'PRODUCTION', 'ADJUSTMENT_ADD', 'SALES_RETURN']);
const DECREASING_MOVEMENTS = new Set(['CONSUMPTION', 'SALES', 'ADJUSTMENT_REDUCE', 'PURCHASE_RETURN', 'RETURN']);

/**
 * Records a stock movement coming from another module (Purchase/Order/Production)
 * or a manual stock adjustment, by inserting a StockAdjustment row — the real
 * schema has no separate movement-log table, so the source reference (which used
 * to dedup against a dedicated log table) is encoded into StockAdjustment.remark
 * instead, and checked before inserting so retries of the same event don't
 * double-count stock.
 */
async function applyMovement({
  category, // "RawMaterial" | "FinishedGoods" | "TradingMaterial"
  firmName,
  itemName,
  movementType, // RECEIPT | CONSUMPTION | ADJUSTMENT_ADD | ADJUSTMENT_REDUCE | RETURN | SALES | SALES_RETURN | PURCHASE_RETURN | PRODUCTION
  quantity,
  sourceModule, // "purchase" | "production" | "order" | "manual"
  sourceTable,
  sourceId,
  skipStockAdjustment = false, // true when the caller already inserted the StockAdjustment row itself
}) {
  const qty = Number(quantity) || 0;
  if (qty <= 0 || skipStockAdjustment) return;

  const materialType = CATEGORY_TO_MATERIAL_TYPE[category];
  if (!materialType) return;

  let status = null;
  if (INCREASING_MOVEMENTS.has(movementType)) status = 'Factory +';
  else if (DECREASING_MOVEMENTS.has(movementType)) status = 'Factory -';
  if (!status) return;

  const normFirm = normalizeFirmName(firmName);
  const sourceRef =
    sourceModule && sourceTable && sourceId ? `${sourceModule}:${sourceTable}#${sourceId} (${movementType})` : null;

  if (sourceRef) {
    const existing = await prisma.inventoryStockAdjustment.findFirst({ where: { remark: sourceRef } });
    if (existing) return;
  }

  await prisma.inventoryStockAdjustment.create({
    data: {
      entryDate: new Date(),
      firmName: normFirm,
      itemName,
      qty,
      status,
      materialType,
      remark: sourceRef,
    },
  });
}

module.exports = {
  applyMovement,
};
