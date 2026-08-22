// One-off backfill: submitReceipt used to only push a lift's quantity into
// Inventory's Raw Material stock when unloadApprovalRequired === 'Yes' (via the
// Unload Approval page). Receipts with unloadApprovalRequired !== 'Yes' — the
// default, and the common case — never moved Raw Material's Actual Level at
// all. receipt.controller.js now pushes at Receipt-submit time for that case
// going forward; this script backfills every already-submitted receipt that
// missed it. Safe to re-run: applyMovement() dedupes on remark, so already-
// pushed receipts are skipped.
const connectDB = require('../src/config/db');
const prisma = connectDB.prisma;
const { applyMovement } = require('../src/inventory/shared/inventoryMovement.service');

async function main() {
  const receipts = await prisma.purchaseReceipt.findMany({
    where: { unloadApprovalRequired: { not: 'Yes' } },
    include: { lift: true },
  });

  let pushed = 0;
  let skippedNoLift = 0;
  let skippedAlready = 0;

  for (const receipt of receipts) {
    const lift = receipt.lift;
    if (!lift?.rawMaterialName) {
      skippedNoLift += 1;
      continue;
    }

    const before = await prisma.inventoryStockAdjustment.count({
      where: { remark: `purchase:PurchaseReceipt#${receipt.id} (RECEIPT)` },
    });

    await applyMovement({
      category: 'RawMaterial',
      firmName: lift.firmName,
      itemName: lift.rawMaterialName,
      movementType: 'RECEIPT',
      quantity: receipt.actualQuantity || lift.liftingQty || lift.qty || 0,
      sourceModule: 'purchase',
      sourceTable: 'PurchaseReceipt',
      sourceId: String(receipt.id),
    });

    if (before === 0) {
      const after = await prisma.inventoryStockAdjustment.count({
        where: { remark: `purchase:PurchaseReceipt#${receipt.id} (RECEIPT)` },
      });
      if (after > 0) pushed += 1;
      else skippedAlready += 1; // qty was 0 / falsy, applyMovement no-ops
    } else {
      skippedAlready += 1;
    }
  }

  console.log(`Receipts scanned: ${receipts.length}`);
  console.log(`Stock adjustments newly created: ${pushed}`);
  console.log(`Already had a movement / zero qty: ${skippedAlready}`);
  console.log(`Skipped (no linked lift / raw material name): ${skippedNoLift}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
