/**
 * Inventory Pure Calculation Formulas
 * Ported verbatim from the reference app's live logic (src/services/api.js,
 * src/pages/TradingMaterial.jsx, src/pages/StockAdjustment.jsx in
 * _reference/Inventory-Management-System) — the real schema stores max_qty/
 * optimum_qty as plain user-entered fields (not generated columns) and no
 * product rate anywhere on the master rows, so "current level" and rate-based
 * valuations are computed here from op_stock + live cross-module data, exactly
 * like the reference app does against its five separate Supabase projects.
 */

/**
 * Calculates daily consumption based on annual consumption.
 * Formula: round((annual_consumption / 365.0), 3)
 */
function dailyConsumption(annualConsumption) {
  const val = Number(annualConsumption);
  if (!Number.isFinite(val)) return 0;
  return Math.round((val / 365.0) * 1000) / 1000;
}

/**
 * Derives stock warning color flag/band.
 * When max_qty is set: 0 => 'No Stock', >max => 'Excess Stock', else banded
 * by actual/max ratio (>=66% Normal, >=33% Medium, else Low).
 * Else when optimum_qty is set: banded by actual/optimum percentage
 * (<33% Low, <66% Medium, <=100% Normal, else Excess).
 */
function colour(actualLevel, maxQty, optimumQty) {
  const actual = Number(actualLevel) || 0;
  const max = Number(maxQty);
  if (Number.isFinite(max) && max !== 0) {
    if (actual === 0) return 'No Stock';
    if (actual > max) return 'Excess Stock';
    const ratio = actual / max;
    if (ratio >= 0.66) return 'Normal Stock';
    if (ratio >= 0.33) return 'Medium Stock';
    return 'Low Stock';
  }
  const optimum = Number(optimumQty);
  if (Number.isFinite(optimum) && optimum !== 0) {
    const pct = (actual / optimum) * 100;
    if (pct < 33) return 'Low Stock';
    if (pct < 66) return 'Medium Stock';
    if (pct <= 100) return 'Normal Stock';
    return 'Excess Stock';
  }
  return '';
}

/**
 * Current actual stock monetary valuation.
 * Formula: round((actual_level * product_rate), 2)
 */
function stockTotal(actualLevel, productRate) {
  const lvl = Number(actualLevel);
  const rate = Number(productRate);
  if (!Number.isFinite(lvl) || !Number.isFinite(rate)) return 0;
  return Math.round(lvl * rate * 100) / 100;
}

/**
 * Optimum stock monetary valuation.
 * Formula: round((optimum_qty * product_rate), 2)
 */
function optimumStockTotal(optimumQty, productRate) {
  const opt = Number(optimumQty);
  const rate = Number(productRate);
  if (!Number.isFinite(opt) || !Number.isFinite(rate)) return 0;
  return Math.round(opt * rate * 100) / 100;
}

/**
 * Calculates Finished Goods current level.
 * Formula: op_stock + stock_adjustment + purchase_material_received + production +
 *          sales_return - purchase_return - sales - consumption
 */
function finishedGoodCurrentLevel(
  opStock = 0,
  purchaseReceived = 0,
  production = 0,
  adjustment = 0,
  sales = 0,
  salesReturn = 0,
  consumption = 0,
  purchaseReturn = 0
) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (
    num(opStock) +
    num(adjustment) +
    num(purchaseReceived) +
    num(production) +
    num(salesReturn) -
    num(purchaseReturn) -
    num(sales) -
    num(consumption)
  );
}

/**
 * Calculates Trading Material current level.
 * Formula: op_stock + stock_adjustment + purchase_material_received - purchase_return - sales + sales_return
 */
function tradingMaterialCurrentLevel(
  opStock = 0,
  stockAdjustment = 0,
  purchaseReceived = 0,
  purchaseReturn = 0,
  sales = 0,
  salesReturn = 0
) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (
    num(opStock) +
    num(stockAdjustment) +
    num(purchaseReceived) +
    num(salesReturn) -
    num(purchaseReturn) -
    num(sales)
  );
}

/**
 * Calculates Raw Material actual level.
 * Formula: op_stock + stock_adjustment + (purchase_receipts - purchase_return)
 *          + production_output - production_consumption - raw_material_sales
 *
 * production_output covers raw-material-tracked items that are themselves
 * produced rather than purchased — crushing outputs (fines/grains/etc.) and
 * semi-finished goods, which get consumed further downstream the same way a
 * purchased raw material would.
 */
function rawMaterialActualLevel(
  opStock = 0,
  stockAdjustment = 0,
  purchaseReceived = 0,
  consumption = 0,
  purchaseReturn = 0,
  sales = 0,
  productionOutput = 0
) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (
    num(opStock) +
    num(stockAdjustment) +
    num(purchaseReceived) +
    num(productionOutput) -
    num(purchaseReturn) -
    num(consumption) -
    num(sales)
  );
}

module.exports = {
  dailyConsumption,
  colour,
  stockTotal,
  optimumStockTotal,
  finishedGoodCurrentLevel,
  tradingMaterialCurrentLevel,
  rawMaterialActualLevel,
};
