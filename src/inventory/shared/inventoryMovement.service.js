const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName } = require('./inventorySync.service');

/**
 * Recalculates and updates actualLevel / currentLevel for a item.
 */
async function applyMovement({
  category, // "RawMaterial" | "FinishedGoods" | "TradingMaterial"
  firmName,
  itemName,
  movementType, // RECEIPT | CONSUMPTION | ADJUSTMENT | RETURN | SALES | PRODUCTION
  quantity,
  sourceModule, // "purchase" | "production" | "order" | "manual"
  sourceTable,
  sourceId,
  rawMaterialId,
}) {
  const normFirm = normalizeFirmName(firmName);
  const qty = Number(quantity) || 0;

  if (category === 'RawMaterial') {
    // 1. Record Movement Log
    if (sourceModule && sourceTable && sourceId) {
      await prisma.inventoryMovement.upsert({
        where: {
          sourceModule_sourceTable_sourceId_movementType: {
            sourceModule,
            sourceTable,
            sourceId: String(sourceId),
            movementType,
          },
        },
        update: {
          quantity: qty,
          firmName: normFirm,
          itemName,
        },
        create: {
          rawMaterialId,
          firmName: normFirm,
          itemName,
          movementType,
          quantity: qty,
          sourceModule,
          sourceTable,
          sourceId: String(sourceId),
        },
      });
    }

    // 2. Adjust Raw Material actualLevel
    const rm = await prisma.inventoryRawMaterial.findUnique({
      where: { firmName_itemName: { firmName: normFirm, itemName } },
    });

    if (rm) {
      let delta = 0;
      if (['RECEIPT', 'ADJUSTMENT_ADD'].includes(movementType)) {
        delta = qty;
      } else if (['CONSUMPTION', 'RETURN', 'ADJUSTMENT_REDUCE'].includes(movementType)) {
        delta = -qty;
      }
      const newLevel = Math.max(0, (rm.actualLevel || 0) + delta);
      await prisma.inventoryRawMaterial.update({
        where: { id: rm.id },
        data: { actualLevel: newLevel },
      });
    }
  } else if (category === 'FinishedGoods') {
    const fg = await prisma.inventoryFinishedGoods.findUnique({
      where: { firmName_productName: { firmName: normFirm, productName: itemName } },
    });

    if (fg) {
      let updateData = {};
      if (movementType === 'PRODUCTION') {
        updateData.production = (fg.production || 0) + qty;
      } else if (movementType === 'SALES') {
        updateData.sales = (fg.sales || 0) + qty;
      } else if (movementType === 'SALES_RETURN') {
        updateData.salesReturn = (fg.salesReturn || 0) + qty;
      } else if (movementType === 'PURCHASE_RETURN') {
        updateData.purchaseReturn = (fg.purchaseReturn || 0) + qty;
      } else if (movementType === 'CONSUMPTION') {
        updateData.consumption = (fg.consumption || 0) + qty;
      } else if (movementType === 'ADJUSTMENT_ADD') {
        updateData.stockAdjustment = (fg.stockAdjustment || 0) + qty;
      } else if (movementType === 'ADJUSTMENT_REDUCE') {
        updateData.stockAdjustment = (fg.stockAdjustment || 0) - qty;
      }

      // Recompute current level
      const updated = { ...fg, ...updateData };
      const currentLevel =
        (updated.opStock || 0) +
        (updated.stockAdjustment || 0) +
        (updated.purchaseMaterialReceived || 0) +
        (updated.liftMaterial || 0) +
        (updated.inTransit || 0) +
        (updated.production || 0) +
        (updated.salesReturn || 0) -
        (updated.purchaseReturn || 0) -
        (updated.sales || 0) -
        (updated.consumption || 0);

      updateData.currentLevel = currentLevel;

      await prisma.inventoryFinishedGoods.update({
        where: { id: fg.id },
        data: updateData,
      });
    }
  } else if (category === 'TradingMaterial') {
    const tm = await prisma.inventoryTradingMaterial.findUnique({
      where: { firmName_productName: { firmName: normFirm, productName: itemName } },
    });

    if (tm) {
      let updateData = {};
      if (movementType === 'RECEIPT') {
        updateData.purchaseMaterialReceived = (tm.purchaseMaterialReceived || 0) + qty;
      } else if (movementType === 'PURCHASE_RETURN') {
        updateData.purchaseReturn = (tm.purchaseReturn || 0) + qty;
      } else if (movementType === 'SALES') {
        updateData.sales = (tm.sales || 0) + qty;
      } else if (movementType === 'SALES_RETURN') {
        updateData.salesReturn = (tm.salesReturn || 0) + qty;
      } else if (movementType === 'ADJUSTMENT_ADD') {
        updateData.stockAdjustment = (tm.stockAdjustment || 0) + qty;
      } else if (movementType === 'ADJUSTMENT_REDUCE') {
        updateData.stockAdjustment = (tm.stockAdjustment || 0) - qty;
      }

      const updated = { ...tm, ...updateData };
      const currentLevel =
        (updated.opStock || 0) +
        (updated.stockAdjustment || 0) +
        (updated.purchaseMaterialReceived || 0) +
        (updated.salesReturn || 0) -
        (updated.purchaseReturn || 0) -
        (updated.sales || 0);

      updateData.currentLevel = currentLevel;

      await prisma.inventoryTradingMaterial.update({
        where: { id: tm.id },
        data: updateData,
      });
    }
  }
}

module.exports = {
  applyMovement,
};
