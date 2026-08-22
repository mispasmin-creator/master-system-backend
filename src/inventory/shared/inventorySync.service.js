const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

/**
 * Normalizes firm name to standard literal ('Purab' | 'Pmmpl' | 'Rkl').
 * Folds 'Madhya' into 'Pmmpl'.
 */
function normalizeFirmName(value) {
  const str = String(value || '').toLowerCase().trim();
  if (str.includes('pmmpl') || str.includes('madhya')) {
    return 'Pmmpl';
  }
  if (str.includes('rkl')) {
    return 'Rkl';
  }
  if (str.includes('purab')) {
    return 'Purab';
  }
  return value || '';
}

/**
 * Normalizes item/product keys for matching across modules.
 */
function normalizeItemKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * A receipt has actually landed in stock once unload approval either isn't
 * required for it, or has been marked Completed. Both flags live directly on
 * PurchaseReceipt (see purchase/unload-approval/unloadApproval.controller.js
 * — it writes to PurchaseReceipt, never to the separate, always-empty
 * PurchaseUnloadApproval table), so this checks PurchaseReceipt's own fields
 * rather than joining a relation nothing ever populates.
 */
function isReceiptStockedIn(receipt) {
  if (!receipt) return false;
  if (String(receipt.unloadApprovalRequired || 'No').toLowerCase() !== 'yes') return true;
  return String(receipt.unloadApprovalStatus || '').toLowerCase() === 'completed';
}

/**
 * Returns raw material receipt totals grouped by rawMaterialName from
 * PurchaseLift + PurchaseReceipt, counting only receipts that have actually
 * landed in stock (see isReceiptStockedIn above).
 */
async function getRawMaterialReceipts(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const whereClause = {
    receipt: {
      isNot: null,
    },
  };

  if (dateRange.startDate || dateRange.endDate) {
    whereClause.receipt.dateOfReceiving = {};
    if (dateRange.startDate) whereClause.receipt.dateOfReceiving.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) whereClause.receipt.dateOfReceiving.lte = new Date(dateRange.endDate);
  }

  const lifts = await prisma.purchaseLift.findMany({
    where: whereClause,
    include: {
      receipt: true,
    },
  });

  const receiptsMap = {};

  for (const lift of lifts) {
    if (targetFirm && normalizeFirmName(lift.firmName) !== targetFirm) {
      continue;
    }
    if (!isReceiptStockedIn(lift.receipt)) continue;

    const matName = lift.rawMaterialName;
    if (!matName) continue;

    const qty = lift.receipt?.actualQuantity || lift.liftingQty || lift.qty || 0;
    const itemKey = normalizeItemKey(matName);

    if (!receiptsMap[itemKey]) {
      receiptsMap[itemKey] = {
        itemName: matName,
        quantity: 0,
        firmName: targetFirm || lift.firmName,
      };
    }
    receiptsMap[itemKey].quantity += qty;
  }

  return receiptsMap;
}

/**
 * Returns latest rate per raw material item from PurchaseMismatch or PurchaseLift.
 */
async function getRawMaterialRates(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const mismatches = await prisma.purchaseMismatch.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      firmName: true,
      productName: true,
      rate: true,
    },
  });

  const lifts = await prisma.purchaseLift.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      firmName: true,
      rawMaterialName: true,
      rate: true,
    },
  });

  const ratesMap = {};

  for (const row of mismatches) {
    if (targetFirm && normalizeFirmName(row.firmName) !== targetFirm) continue;
    if (!row.productName || !row.rate) continue;
    const key = normalizeItemKey(row.productName);
    if (ratesMap[key] === undefined) {
      ratesMap[key] = row.rate;
    }
  }

  for (const row of lifts) {
    if (targetFirm && normalizeFirmName(row.firmName) !== targetFirm) continue;
    if (!row.rawMaterialName || !row.rate) continue;
    const key = normalizeItemKey(row.rawMaterialName);
    if (ratesMap[key] === undefined) {
      ratesMap[key] = row.rate;
    }
  }

  return ratesMap;
}

/**
 * Returns raw material consumption totals from ProductionActualMaterial grouped by materialName.
 */
async function getProductionConsumption(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const whereClause = {};
  if (dateRange.startDate || dateRange.endDate) {
    whereClause.actualRun = {
      dateOfProduction: {},
    };
    if (dateRange.startDate) whereClause.actualRun.dateOfProduction.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) whereClause.actualRun.dateOfProduction.lte = new Date(dateRange.endDate);
  }

  const materials = await prisma.productionActualMaterial.findMany({
    where: whereClause,
    include: {
      actualRun: {
        include: {
          jobCard: {
            include: {
              order: true,
            },
          },
        },
      },
    },
  });

  const consumptionMap = {};

  for (const mat of materials) {
    const runFirm = mat.actualRun?.jobCard?.order?.firmName;
    if (targetFirm && runFirm && normalizeFirmName(runFirm) !== targetFirm) {
      continue;
    }

    const matName = mat.materialName;
    const qty = mat.quantity || 0;
    if (!matName) continue;

    const itemKey = normalizeItemKey(matName);
    if (!consumptionMap[itemKey]) {
      consumptionMap[itemKey] = {
        materialName: matName,
        quantity: 0,
      };
    }
    consumptionMap[itemKey].quantity += qty;
  }

  return consumptionMap;
}

/**
 * Returns finished good production totals from ProductionActualRun.quantityFg grouped by product.
 */
async function getFinishedGoodProduction(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const whereClause = {};
  if (dateRange.startDate || dateRange.endDate) {
    whereClause.dateOfProduction = {};
    if (dateRange.startDate) whereClause.dateOfProduction.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) whereClause.dateOfProduction.lte = new Date(dateRange.endDate);
  }

  const runs = await prisma.productionActualRun.findMany({
    where: whereClause,
    include: {
      jobCard: {
        include: {
          order: true,
        },
      },
    },
  });

  const productionMap = {};

  for (const run of runs) {
    const order = run.jobCard?.order;
    if (!order) continue;

    if (targetFirm && normalizeFirmName(order.firmName) !== targetFirm) {
      continue;
    }

    const productName = order.productName;
    const qtyFg = run.quantityFg || 0;
    if (!productName) continue;

    const key = normalizeItemKey(productName);
    if (!productionMap[key]) {
      productionMap[key] = {
        productName,
        quantityFg: 0,
      };
    }
    productionMap[key].quantityFg += qtyFg;
  }

  return productionMap;
}

/**
 * Returns finished good confirmed dispatches from OrderDispatch.
 */
async function getFinishedGoodDispatch(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const whereClause = {};
  if (dateRange.startDate || dateRange.endDate) {
    whereClause.dateOfDispatch = {};
    if (dateRange.startDate) whereClause.dateOfDispatch.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) whereClause.dateOfDispatch.lte = new Date(dateRange.endDate);
  }

  const dispatches = await prisma.orderDispatch.findMany({
    where: whereClause,
    include: {
      receipt: true,
      deliveries: true,
    },
  });

  const dispatchMap = {};

  for (const disp of dispatches) {
    const fName = disp.receipt?.firmName;
    if (targetFirm && fName && normalizeFirmName(fName) !== targetFirm) {
      continue;
    }

    const productName = disp.productName || disp.receipt?.productName;
    const qty = disp.qtyToBeDispatched || 0;
    if (!productName) continue;

    const key = normalizeItemKey(productName);
    if (!dispatchMap[key]) {
      dispatchMap[key] = {
        productName,
        quantity: 0,
      };
    }
    dispatchMap[key].quantity += qty;
  }

  return dispatchMap;
}

/**
 * Returns open/pending OrderDispatch records not yet fully delivered.
 */
async function getFinishedGoodPendingOrders(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const dispatches = await prisma.orderDispatch.findMany({
    where: {
      deliveries: {
        none: {},
      },
    },
    include: {
      receipt: true,
    },
  });

  const pendingMap = {};

  for (const disp of dispatches) {
    const fName = disp.receipt?.firmName;
    if (targetFirm && fName && normalizeFirmName(fName) !== targetFirm) {
      continue;
    }

    const productName = disp.productName || disp.receipt?.productName;
    const qty = disp.qtyToBeDispatched || 0;
    if (!productName) continue;

    const key = normalizeItemKey(productName);
    if (!pendingMap[key]) {
      pendingMap[key] = {
        productName,
        pendingQuantity: 0,
      };
    }
    pendingMap[key].pendingQuantity += qty;
  }

  return pendingMap;
}

/**
 * Returns customer material returns from OrderMaterialReturn.
 */
async function getMaterialReturns(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const returns = await prisma.orderMaterialReturn.findMany({
    include: {
      dispatch: {
        include: {
          receipt: true,
        },
      },
    },
  });

  const returnsMap = {};

  for (const ret of returns) {
    const fName = ret.dispatch?.receipt?.firmName;
    if (targetFirm && fName && normalizeFirmName(fName) !== targetFirm) {
      continue;
    }

    const productName = ret.productName;
    const qty = ret.qty || 0;
    if (!productName) continue;

    const key = normalizeItemKey(productName);
    if (!returnsMap[key]) {
      returnsMap[key] = {
        productName,
        quantity: 0,
      };
    }
    returnsMap[key].quantity += qty;
  }

  return returnsMap;
}

/**
 * Returns purchase returns from PurchasePurchaseReturn.
 */
async function getPurchaseReturns(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const returns = await prisma.purchasePurchaseReturn.findMany();

  const returnsMap = {};

  for (const ret of returns) {
    if (targetFirm && normalizeFirmName(ret.firmName) !== targetFirm) {
      continue;
    }

    const productName = ret.productName;
    const qty = ret.returnThisTime || ret.qty || 0;
    if (!productName) continue;

    const key = normalizeItemKey(productName);
    if (!returnsMap[key]) {
      returnsMap[key] = {
        productName,
        quantity: 0,
      };
    }
    returnsMap[key].quantity += qty;
  }

  return returnsMap;
}

/**
 * Returns crushing consumption (input material) and production (fines/grains/
 * other outputs) totals, scoped by ProductionCrushingRun.firmName.
 */
async function getCrushingFlows(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const runs = await prisma.productionCrushingRun.findMany({
    include: { crushingItem: true, outputs: true },
  });

  const consumption = {};
  const production = {};

  for (const run of runs) {
    if (targetFirm && run.firmName && normalizeFirmName(run.firmName) !== targetFirm) {
      continue;
    }

    const inputName = run.crushingItem?.inputProductName;
    const inputQty = run.inputQty || 0;
    if (inputName && inputQty) {
      const key = normalizeItemKey(inputName);
      if (!consumption[key]) consumption[key] = { itemName: inputName, quantity: 0 };
      consumption[key].quantity += inputQty;
    }

    for (const output of run.outputs || []) {
      if (!output.outputName || !output.quantity) continue;
      const key = normalizeItemKey(output.outputName);
      if (!production[key]) production[key] = { itemName: output.outputName, quantity: 0 };
      production[key].quantity += output.quantity;
    }
  }

  return { consumption, production };
}

/**
 * Returns semi-finished-production consumption (raw/semi materials used) and
 * production (semi-finished good made) totals, scoped by firm via
 * semiActualRun -> semiJobCard -> semiOrder.firmName.
 */
async function getSemiProductionFlows(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const runs = await prisma.productionSemiActualRun.findMany({
    include: {
      materials: true,
      semiJobCard: { include: { semiOrder: true } },
    },
  });

  const consumption = {};
  const production = {};

  for (const run of runs) {
    const order = run.semiJobCard?.semiOrder;
    if (targetFirm && order?.firmName && normalizeFirmName(order.firmName) !== targetFirm) {
      continue;
    }

    for (const mat of run.materials || []) {
      if (!mat.materialName || !mat.quantity) continue;
      const key = normalizeItemKey(mat.materialName);
      if (!consumption[key]) consumption[key] = { itemName: mat.materialName, quantity: 0 };
      consumption[key].quantity += mat.quantity;
    }

    const producedName = order?.semiGoodName;
    const producedQty = run.qtyProduced || 0;
    if (producedName && producedQty) {
      const key = normalizeItemKey(producedName);
      if (!production[key]) production[key] = { itemName: producedName, quantity: 0 };
      production[key].quantity += producedQty;
    }

    // A run can additionally be flagged as yielding a distinct final product
    // (e.g. the semi-finished good is itself finished off in the same run).
    if (run.isEndProduct && run.endProductName && run.endProductQty) {
      const key = normalizeItemKey(run.endProductName);
      if (!production[key]) production[key] = { itemName: run.endProductName, quantity: 0 };
      production[key].quantity += run.endProductQty;
    }
  }

  return { consumption, production };
}

/**
 * Returns raw material sales totals from completed RmSales orders, grouped by
 * productName. RmSales runs its own separate stock ledger (RmSalesInventory/
 * RmSalesProduct) via src/rmsales/invoice/invoice.controller.js, but the main
 * Inventory raw-material dashboard needs the same completed-sale quantities
 * to report an accurate "raw material sales" figure.
 */
async function getRawMaterialSales(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const orders = await prisma.rmSalesOrder.findMany({
    where: { status: 'Completed' },
    select: { firmName: true, productName: true, qty: true },
  });

  const salesMap = {};

  for (const order of orders) {
    if (targetFirm && normalizeFirmName(order.firmName) !== targetFirm) continue;
    if (!order.productName) continue;

    const key = normalizeItemKey(order.productName);
    if (!salesMap[key]) salesMap[key] = { productName: order.productName, quantity: 0 };
    salesMap[key].quantity += order.qty || 0;
  }

  return salesMap;
}

/**
 * Auto-generated movement rows (written by the old, now-removed
 * applyMovement() hooks in purchase/production/order controllers) tag
 * `remark` with a "<sourceModule>:<sourceTable>#<id> (<movementType>)"
 * pattern — e.g. "purchase:PurchaseReceipt#6 (RECEIPT)". Genuine manual
 * entries (from stock-adjustment/stockAdjustment.controller.js) always have
 * either a null/blank remark or free-text the user typed, never this shape.
 * Excluding rows matching this pattern keeps the Stock Adjustment ledger to
 * manual entries only, and stops any such row (old data, or a stray future
 * one) from double-counting against the live purchase/production/sales
 * aggregators, which already account for those events on their own.
 */
const AUTO_GENERATED_REMARK_PREFIXES = ['purchase:', 'production:', 'order:', 'manual:'];

function excludeAutoGeneratedMovements(whereClause = {}) {
  return {
    ...whereClause,
    NOT: AUTO_GENERATED_REMARK_PREFIXES.map((prefix) => ({ remark: { startsWith: prefix } })),
  };
}

/**
 * Sums the signed stock_adjustment rows for one item ('Factory +' adds,
 * 'Factory -' subtracts) — the real schema's only source of "movement"
 * for a master row, since op_stock is a plain baseline with no other
 * running-total columns. Used to derive actual/current level on read.
 */
async function getStockAdjustmentTotal(materialType, firmName, itemName) {
  const rows = await prisma.inventoryStockAdjustment.findMany({
    where: excludeAutoGeneratedMovements({
      materialType,
      firmName: normalizeFirmName(firmName),
      itemName,
    }),
    select: { qty: true, status: true },
  });

  return rows.reduce((sum, row) => {
    const qty = Number(row.qty) || 0;
    return row.status === 'Factory -' ? sum - qty : sum + qty;
  }, 0);
}

/**
 * Same as getStockAdjustmentTotal but for every item of a material type in
 * one query — avoids N+1 queries when listing a whole master table.
 */
async function getStockAdjustmentTotals(materialType, firmName) {
  const whereClause = { materialType };
  if (firmName) whereClause.firmName = normalizeFirmName(firmName);

  const rows = await prisma.inventoryStockAdjustment.findMany({
    where: excludeAutoGeneratedMovements(whereClause),
    select: { itemName: true, qty: true, status: true },
  });

  const totals = {};
  for (const row of rows) {
    const key = normalizeItemKey(row.itemName);
    const qty = Number(row.qty) || 0;
    const signedQty = row.status === 'Factory -' ? -qty : qty;
    totals[key] = (totals[key] || 0) + signedQty;
  }
  return totals;
}

module.exports = {
  normalizeFirmName,
  excludeAutoGeneratedMovements,
  normalizeItemKey,
  isReceiptStockedIn,
  getRawMaterialReceipts,
  getRawMaterialRates,
  getProductionConsumption,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
  getCrushingFlows,
  getSemiProductionFlows,
  getRawMaterialSales,
  getStockAdjustmentTotal,
  getStockAdjustmentTotals,
};
