/**
 * Inventory Pure Calculation Formulas
 * Ported verbatim from database constraints and old app formulas
 * (purchase_inventory_master.sql, finished_goods_inventory_master.sql, trading_material_master.sql)
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
 * Calculates optimum stock quantity.
 * Formula: round(((annual_consumption / 365.0) * lead_time_days * safety_factor), 3)
 */
function optimumStock(annualConsumption, leadTimeDays, safetyFactor = 1) {
  const ann = Number(annualConsumption);
  const lead = Number(leadTimeDays);
  const sf = Number(safetyFactor);
  if (!Number.isFinite(ann) || !Number.isFinite(lead) || !Number.isFinite(sf)) return 0;
  const opt = (ann / 365.0) * lead * sf;
  return Math.round(opt * 1000) / 1000;
}

/**
 * Calculates maximum stock threshold.
 * Formula: round((optimum_stock * 1.5), 3)
 */
function maxStock(annualConsumption, leadTimeDays, safetyFactor = 1) {
  const opt = optimumStock(annualConsumption, leadTimeDays, safetyFactor);
  return Math.round(opt * 1.5 * 1000) / 1000;
}

/**
 * Calculates optimum stock total monetary value.
 * Formula: round((optimum_stock * product_rate), 2)
 */
function optimumStockTotal(annualConsumption, leadTimeDays, safetyFactor, productRate) {
  const opt = optimumStock(annualConsumption, leadTimeDays, safetyFactor);
  const rate = Number(productRate);
  if (!Number.isFinite(rate)) return 0;
  return Math.round(opt * rate * 100) / 100;
}

/**
 * Calculates current actual stock monetary valuation.
 * Formula: round((actual_level * product_rate), 2)
 */
function stockTotal(actualLevel, productRate) {
  const lvl = Number(actualLevel);
  const rate = Number(productRate);
  if (!Number.isFinite(lvl) || !Number.isFinite(rate)) return 0;
  return Math.round(lvl * rate * 100) / 100;
}

/**
 * Derives stock warning color flag.
 * Formula: actual_level > max_stock => 'Excess Stock', else ''
 */
function colour(actualLevel, annualConsumption, leadTimeDays, safetyFactor = 1) {
  const lvl = Number(actualLevel);
  if (!Number.isFinite(lvl)) return '';
  const max = maxStock(annualConsumption, leadTimeDays, safetyFactor);
  return lvl > max ? 'Excess Stock' : '';
}

/**
 * Calculates Finished Goods current level.
 * Formula: op_stock + stock_adjustment + purchase_material_received + lift_material +
 *          in_transit + production + sales_return - purchase_return - sales - consumption
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

module.exports = {
  dailyConsumption,
  optimumStock,
  maxStock,
  optimumStockTotal,
  stockTotal,
  colour,
  finishedGoodCurrentLevel,
  tradingMaterialCurrentLevel,
};
