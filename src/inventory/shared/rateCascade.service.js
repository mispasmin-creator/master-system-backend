/**
 * Raw-material "Product Rate" cascade — ported from the reference app's live
 * logic (`_reference/Inventory-Management-System/src/services/api.js`,
 * `buildLiftDataMaps` + the `derivedSemiRatesMap` block in `getInventory`).
 * That reference computes rate as a last-purchase-rate cascade with special
 * cases, NOT a weighted-average cost — this file reproduces the same
 * priority order:
 *
 *   1. Latest purchase rate (by Date Of Receiving), with:
 *      - a bag-item formula: (liftingQty * rate) / totalBagsQty
 *      - a /1000 unit conversion for items purchased in MT but tracked in Ltr
 *      - a + transportation-rate addend (Transporter Rate / Lifting Qty),
 *        only for "Per MT"/"Fixed" transporting-rate types
 *   2. Fallback: latest manually-entered rate (the "Product Tab" — plain
 *      InventoryStockAdjustment.rate for that item)
 *   3. Fallback: a derived rate for semi-finished/produced items, computed
 *      from the latest production run that made them — weighted by
 *      component quantity/cost (excluding fuel/diesel/oil from the divisor),
 *      resolved iteratively since a component can itself be a derived item.
 *   4. Final fallback: 0.
 *
 * Items whose name ends in "fines" are produced, not purchased, so step 3
 * is preferred over step 1 for them when a derived rate is available —
 * mirrors the reference's `useProductionRateFirst` flag.
 *
 * Deliberately NOT ported here (confirmed absent from the reference's live
 * `api.js` cascade itself — only present in its separate nightly snapshot
 * edge function as extra overrides): crushing-output processing-cost
 * blending and cross-item rate borrowing between related grain grades. Those
 * can be added later if needed; this cascade already covers the actual live
 * "Product Rate" logic used on every read.
 */
const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName, normalizeItemKey, isReceiptStockedIn } = require('./inventorySync.service');

// Packaging items whose Product Rate is (liftingQty * rate) / totalBagsQty
// instead of the plain lift Rate column.
const BAG_RATE_ITEM_KEYS = new Set(
  ['Pasheat-CLC PP Bags 25 Kg', 'PP Bag (25 kgs)', 'Pp Bag (50 kgs)', 'PP BAG B - 25'].map(normalizeItemKey)
);

// Items purchased in MT but tracked/used in Ltr, so their rate is per-1000-units.
const RATE_DIVIDE_BY_1000_ITEM_KEYS = new Set(['Light Diesel Oil'].map(normalizeItemKey));

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Step 1: latest-by-receiving-date purchase rate + transportation rate,
 * per item key (already firm-scoped by the caller).
 */
async function getPurchaseRateMaps(targetFirm) {
  const lifts = await prisma.purchaseLift.findMany({
    where: { receipt: { isNot: null } },
    include: { receipt: true },
  });

  const poRatesMap = {};
  const transportRatesMap = {};
  const latestDateMap = {};

  for (const lift of lifts) {
    if (targetFirm && normalizeFirmName(lift.firmName) !== targetFirm) continue;
    const itemKey = normalizeItemKey(lift.rawMaterialName);
    if (!itemKey) continue;

    const receipt = lift.receipt;
    const rowDate = receipt?.dateOfReceiving;
    if (!rowDate) continue;

    let rate;
    if (BAG_RATE_ITEM_KEYS.has(itemKey)) {
      const billingQty = Number(lift.liftingQty);
      const rawRate = Number(lift.rate);
      const totalBagQty = Number(receipt.totalBagsQty);
      rate =
        isReceiptStockedIn(receipt) &&
        Number.isFinite(billingQty) &&
        Number.isFinite(rawRate) &&
        Number.isFinite(totalBagQty) &&
        totalBagQty !== 0
          ? (billingQty * rawRate) / totalBagQty
          : NaN;
    } else {
      rate = Number(lift.rate);
    }

    if (RATE_DIVIDE_BY_1000_ITEM_KEYS.has(itemKey) && Number.isFinite(rate)) {
      rate = rate / 1000;
    }
    if (!Number.isFinite(rate)) continue;

    const prevDate = latestDateMap[itemKey];
    if (prevDate && rowDate <= prevDate) continue;

    latestDateMap[itemKey] = rowDate;
    poRatesMap[itemKey] = rate;

    const rateType = String(lift.typeOfTransportingRate || '').trim().toLowerCase();
    const transporterRate = Number(lift.transporterRate);
    const liftingQty = Number(lift.liftingQty);
    transportRatesMap[itemKey] =
      (rateType === 'per mt' || rateType === 'fixed') &&
      Number.isFinite(transporterRate) &&
      Number.isFinite(liftingQty) &&
      liftingQty !== 0
        ? round2(transporterRate / liftingQty)
        : 0;
  }

  return { poRatesMap, transportRatesMap };
}

/**
 * Step 2: latest manually-entered "Product Tab" rate per item, from
 * InventoryStockAdjustment.rate (materialType = 'raw_material').
 */
async function getProductTabRateMap(targetFirm) {
  const whereClause = { materialType: 'raw_material', rate: { not: null } };
  if (targetFirm) whereClause.firmName = targetFirm;

  const adjustments = await prisma.inventoryStockAdjustment.findMany({
    where: whereClause,
    orderBy: { entryDate: 'desc' },
    select: { firmName: true, itemName: true, rate: true, entryDate: true },
  });

  const map = {};
  for (const adj of adjustments) {
    const key = normalizeItemKey(adj.itemName);
    if (map[key] === undefined) map[key] = adj.rate;
  }
  return map;
}

/**
 * Step 3 input: for every item produced by semi-production, the components
 * (raw materials + qty) and processing cost of its MOST RECENT run — mirrors
 * the reference's `latestSemiComponentsMap`.
 */
async function getLatestSemiComponents(targetFirm) {
  const runs = await prisma.productionSemiActualRun.findMany({
    where: {
      semiJobCard: targetFirm ? { semiOrder: { firmName: targetFirm } } : undefined,
    },
    include: {
      materials: true,
      semiJobCard: { include: { semiOrder: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const map = {};
  for (const run of runs) {
    const producedName = run.semiJobCard?.semiOrder?.semiGoodName;
    if (!producedName) continue;
    const key = normalizeItemKey(producedName);
    if (map[key]) continue; // already have the most recent run for this item

    const components = (run.materials || [])
      .filter((m) => m.materialName && m.quantity)
      .map((m) => ({ key: normalizeItemKey(m.materialName), qty: m.quantity }));
    if (!components.length) continue;

    const processingCost = (run.materials || []).reduce((sum, m) => sum + (m.processingCost || 0), 0);
    map[key] = { components, processingCost };
  }
  return map;
}

/**
 * Resolves a raw-material product-rate cascade for one firm, keyed by
 * normalizeItemKey(itemName) — mirrors the reference's per-`firm::item`
 * priority order end to end.
 */
async function getRateCascade(firmName) {
  const targetFirm = normalizeFirmName(firmName);

  const [{ poRatesMap, transportRatesMap }, productTabRateMap, latestComponentsMap] = await Promise.all([
    getPurchaseRateMaps(targetFirm),
    getProductTabRateMap(targetFirm),
    getLatestSemiComponents(targetFirm),
  ]);

  // Step 3: derive rates for produced (semi-finished) items, resolved
  // iteratively since a component can itself be a derived item.
  const derivedRatesMap = {};
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const [key, info] of Object.entries(latestComponentsMap)) {
      let totalCost = 0;
      let solidQty = 0;
      let totalQty = 0;
      let hasValidComponentRate = false;

      for (const comp of info.components) {
        let rmRate =
          poRatesMap[comp.key] !== undefined
            ? poRatesMap[comp.key]
            : productTabRateMap[comp.key] !== undefined
            ? productTabRateMap[comp.key]
            : derivedRatesMap[comp.key] !== undefined
            ? derivedRatesMap[comp.key]
            : 0;

        if (derivedRatesMap[comp.key] !== undefined) {
          rmRate = Number(rmRate || 0) + (latestComponentsMap[comp.key]?.processingCost || 0);
        }

        const numericRate = Number(rmRate || 0);
        if (numericRate > 0) hasValidComponentRate = true;
        totalCost += comp.qty * numericRate;

        const isFuel = comp.key.includes('diesel') || comp.key.includes('fuel') || comp.key.includes('oil');
        if (!isFuel) solidQty += comp.qty;
        totalQty += comp.qty;
      }

      const divisorQty = solidQty > 0 ? solidQty : totalQty;
      if (hasValidComponentRate && divisorQty > 0) {
        const calcRate = round2(totalCost / divisorQty);
        if (derivedRatesMap[key] !== calcRate) {
          derivedRatesMap[key] = calcRate;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Combine per item, in priority order (fines items prefer their derived
  // production rate over a purchase rate — they're produced, not bought).
  const allKeys = new Set([
    ...Object.keys(poRatesMap),
    ...Object.keys(productTabRateMap),
    ...Object.keys(derivedRatesMap),
  ]);

  const result = {};
  for (const key of allKeys) {
    const derivedRate = derivedRatesMap[key];
    const isFinesItem = key.endsWith('fines');
    const useProductionRateFirst = isFinesItem && derivedRate !== undefined;

    const baseRate = useProductionRateFirst
      ? derivedRate
      : poRatesMap[key] !== undefined
      ? poRatesMap[key]
      : productTabRateMap[key] !== undefined
      ? productTabRateMap[key]
      : derivedRate !== undefined
      ? derivedRate
      : 0;

    // When a production-derived rate is used as the item's own base rate,
    // add its own run's processing cost on top (the reference does this in
    // its frontend display layer — folded in here instead since this is the
    // single place both backend and frontend read the rate from).
    const ownProcessingCost = useProductionRateFirst ? latestComponentsMap[key]?.processingCost || 0 : 0;

    const transRate = transportRatesMap[key] || 0;
    result[key] = Number(baseRate || 0) + ownProcessingCost + transRate;
  }

  return result;
}

module.exports = { getRateCascade };
