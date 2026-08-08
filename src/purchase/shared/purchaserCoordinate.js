// Reference system (Purchase-FMS) populates the "purchaser_coordinates" table
// via an out-of-repo Supabase DB trigger that fires whenever a new mismatch
// is detected, seeding a PENDING coordination row. Since PurchaseMismatch rows
// in this backend are already seeded from two places (rate mismatch on lift
// creation, quality mismatch on lab fail), we replicate that trigger here:
// call this right after a PurchaseMismatch row is first created.
//
// `type` mirrors Mismatch."Action Type" values used downstream by
// PurchaserCoord.jsx / PurchaseReturn.jsx / Debit-note.jsx:
//   - "Make Debit Note"                    -> pure value/billing adjustment
//   - "Return Material and Make Debit Note" -> physical material needs return

const seedPurchaserCoordinate = async (tx, { mismatchId, poNumber, vendorName, transporterName, materialName, type }) => {
  if (!mismatchId) return;

  const existing = await tx.purchasePurchaserCoordinate.findFirst({ where: { mismatchId } });
  if (existing) return;

  await tx.purchasePurchaserCoordinate.create({
    data: {
      mismatchId,
      poNumber: poNumber || null,
      vendorName: vendorName || null,
      transporterName: transporterName || null,
      materialName: materialName || null,
      type: type || null,
      status: 'PENDING',
    },
  });
};

module.exports = { seedPurchaserCoordinate };
