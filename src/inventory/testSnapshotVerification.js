const { captureSnapshot } = require('./shared/dailySnapshot.service');
const connectDB = require('../config/db');
const prisma = connectDB.prisma;

async function testSnapshotVerification() {
  console.log('====================================================');
  console.log('Verification: Daily Inventory Stock Snapshot');
  console.log('====================================================');

  const testDate = '2026-08-01';

  // 1. First populate dummy item in master models if empty to verify count equality
  const rawCount = await prisma.inventoryRawMaterial.count();
  const fgCount = await prisma.inventoryFinishedGoods.count();

  if (rawCount === 0) {
    console.log('Seeding temporary test Raw Material item...');
    await prisma.inventoryRawMaterial.create({
      data: {
        firmName: 'Pmmpl',
        itemName: 'Snapshot Test Material',
        unit: 'MT',
        opStock: 250,
        actualLevel: 250,
      },
    });
  }

  if (fgCount === 0) {
    console.log('Seeding temporary test Finished Goods item...');
    await prisma.inventoryFinishedGoods.create({
      data: {
        firmName: 'Purab',
        productName: 'Snapshot Test Product',
        opStock: 100,
        currentLevel: 100,
      },
    });
  }

  const expectedRmCount = await prisma.inventoryRawMaterial.count();
  const expectedFgCount = await prisma.inventoryFinishedGoods.count();

  console.log(`Master RawMaterial count: ${expectedRmCount}`);
  console.log(`Master FinishedGoods count: ${expectedFgCount}`);

  // 2. Trigger captureSnapshot for past date
  console.log(`\nExecuting captureSnapshot('${testDate}')...`);
  const result = await captureSnapshot(testDate);

  console.log('\nSnapshot Execution Result:', result);

  // 3. Verify history row counts match master row counts
  const snapshotDateObj = new Date(testDate);
  snapshotDateObj.setUTCHours(0, 0, 0, 0);

  const rmHistCount = await prisma.inventoryRawMaterialHistory.count({
    where: { snapshotDate: snapshotDateObj },
  });

  const fgHistCount = await prisma.inventoryFinishedGoodsHistory.count({
    where: { snapshotDate: snapshotDateObj },
  });

  console.log('\n--- Row Count Verification ---');
  console.log(`RawMaterial History Rows (${testDate}): ${rmHistCount} (Expected: ${expectedRmCount})`);
  console.log(`FinishedGoods History Rows (${testDate}): ${fgHistCount} (Expected: ${expectedFgCount})`);

  if (rmHistCount === expectedRmCount && fgHistCount === expectedFgCount) {
    console.log('\n✅ VERIFICATION SUCCESSFUL: Snapshot row counts match master table row counts exactly!');
  } else {
    console.error('\n❌ VERIFICATION FAILURE: Row count mismatch detected.');
  }

  // Cleanup seeded test items if created
  await prisma.inventoryRawMaterial.deleteMany({ where: { itemName: 'Snapshot Test Material' } });
  await prisma.inventoryFinishedGoods.deleteMany({ where: { productName: 'Snapshot Test Product' } });
  await prisma.inventoryRawMaterialHistory.deleteMany({ where: { itemName: 'Snapshot Test Material' } });
  await prisma.inventoryFinishedGoodsHistory.deleteMany({ where: { productName: 'Snapshot Test Product' } });

  process.exit(0);
}

testSnapshotVerification();
