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
 * Returns raw material receipt totals grouped by rawMaterialName from
 * PurchaseLift + PurchaseReceipt + PurchaseUnloadApproval (only complete unload approvals).
 */
async function getRawMaterialReceipts(firmName, dateRange = {}) {
  const targetFirm = normalizeFirmName(firmName);

  const whereClause = {
    receipt: {
      isNot: null,
    },
    unloadApproval: {
      unloadApprovalStatus: {
        equals: 'Completed',
        mode: 'insensitive',
      },
    },
  };

  if (dateRange.startDate || dateRange.endDate) {
    whereClause.timestamp = {};
    if (dateRange.startDate) whereClause.timestamp.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) whereClause.timestamp.lte = new Date(dateRange.endDate);
  }

  const lifts = await prisma.purchaseLift.findMany({
    where: whereClause,
    include: {
      receipt: true,
      unloadApproval: true,
    },
  });

  const receiptsMap = {};

  for (const lift of lifts) {
    if (targetFirm && normalizeFirmName(lift.firmName) !== targetFirm) {
      continue;
    }
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

module.exports = {
  normalizeFirmName,
  getRawMaterialReceipts,
  getRawMaterialRates,
  getProductionConsumption,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
};
