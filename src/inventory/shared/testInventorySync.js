/**
 * Verification test script for Inventory Sync Service and Formulas.
 * Runs against dev/staging DB via Prisma and prints results.
 */

const {
  normalizeFirmName,
  getRawMaterialReceipts,
  getRawMaterialRates,
  getProductionConsumption,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
} = require('./inventorySync.service');

const {
  dailyConsumption,
  optimumStock,
  maxStock,
  optimumStockTotal,
  stockTotal,
  colour,
  finishedGoodCurrentLevel,
  tradingMaterialCurrentLevel,
} = require('./inventoryFormulas');

async function testInventoryServices() {
  console.log('====================================================');
  console.log('1. Testing Pure Formula Calculations');
  console.log('====================================================');

  const annCon = 3650;
  const leadDays = 10;
  const sf = 1.2;
  const rate = 500;
  const actualLvl = 150;

  console.log('Daily Consumption (3650 ann):', dailyConsumption(annCon));
  console.log('Optimum Stock (3650 ann, 10 lead, 1.2 sf):', optimumStock(annCon, leadDays, sf));
  console.log('Max Stock:', maxStock(annCon, leadDays, sf));
  console.log('Optimum Stock Total ($ rate 500):', optimumStockTotal(annCon, leadDays, sf, rate));
  console.log('Stock Total Valuation (150 actual @ 500):', stockTotal(actualLvl, rate));
  console.log('Colour Flag (150 actual vs Max):', colour(actualLvl, annCon, leadDays, sf));

  console.log('FG Current Level:', finishedGoodCurrentLevel(100, 50, 200, 10, 120, 5, 15, 0));
  console.log('Trading Current Level:', tradingMaterialCurrentLevel(50, 5, 30, 2, 25, 3));

  console.log('\n====================================================');
  console.log('2. Testing Prisma Query Sync Service (Firm: Pmmpl)');
  console.log('====================================================');

  try {
    const rmReceipts = await getRawMaterialReceipts('Pmmpl');
    console.log('\n--- Raw Material Receipts ---');
    console.log('Count:', Object.keys(rmReceipts).length);
    console.log('Sample:', Object.values(rmReceipts).slice(0, 3));

    const rmRates = await getRawMaterialRates('Pmmpl');
    console.log('\n--- Raw Material Rates ---');
    console.log('Count:', Object.keys(rmRates).length);
    console.log('Sample:', Object.entries(rmRates).slice(0, 3));

    const prodConsumption = await getProductionConsumption('Pmmpl');
    console.log('\n--- Production RM Consumption ---');
    console.log('Count:', Object.keys(prodConsumption).length);
    console.log('Sample:', Object.values(prodConsumption).slice(0, 3));

    const fgProduction = await getFinishedGoodProduction('Pmmpl');
    console.log('\n--- Finished Goods Production ---');
    console.log('Count:', Object.keys(fgProduction).length);
    console.log('Sample:', Object.values(fgProduction).slice(0, 3));

    const fgDispatch = await getFinishedGoodDispatch('Pmmpl');
    console.log('\n--- Finished Goods Dispatches ---');
    console.log('Count:', Object.keys(fgDispatch).length);
    console.log('Sample:', Object.values(fgDispatch).slice(0, 3));

    const pendingOrders = await getFinishedGoodPendingOrders('Pmmpl');
    console.log('\n--- Finished Goods Pending Orders ---');
    console.log('Count:', Object.keys(pendingOrders).length);
    console.log('Sample:', Object.values(pendingOrders).slice(0, 3));

    const matReturns = await getMaterialReturns('Pmmpl');
    console.log('\n--- Material Returns ---');
    console.log('Count:', Object.keys(matReturns).length);
    console.log('Sample:', Object.values(matReturns).slice(0, 3));

    const purchReturns = await getPurchaseReturns('Pmmpl');
    console.log('\n--- Purchase Returns ---');
    console.log('Count:', Object.keys(purchReturns).length);
    console.log('Sample:', Object.values(purchReturns).slice(0, 3));

    console.log('\n✅ All Inventory Sync Services executed successfully!');
  } catch (error) {
    console.error('\n❌ Inventory Sync Service Error:', error.message);
  }

  process.exit(0);
}

testInventoryServices();
