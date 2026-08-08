const { prisma } = require('../../config/db');

// @desc    Create an indent — computes the next RI-XXX number atomically
// @route   POST /api/purchase/indent
// @access  Private
const createIndent = async (req, res, next) => {
  try {
    const {
      generatedBy, firmName, rawMaterialName, quantity, currentStock,
      priority, typeOfIndent, deliveryOrderNo, notes, uom, expectedRequirementDate,
    } = req.body;

    if (!firmName || !rawMaterialName || !quantity || !currentStock || !priority || !typeOfIndent || !uom || !expectedRequirementDate) {
      res.status(400);
      throw new Error('Missing required indent fields.');
    }

    const indent = await prisma.$transaction(async (tx) => {
      // Serialize concurrent indent creation so the RI-XXX number stays unique
      // (replaces the old client-side read-last-then-increment race condition).
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('purchase_indent_number'))`
      );

      const latestRows = await tx.$queryRawUnsafe(
        `SELECT "Indent Id." AS "indentId" FROM purchase_indent ORDER BY id DESC LIMIT 1`
      );

      let currentMax = 0;
      const match = latestRows[0]?.indentId?.match(/^(RI|RL)-(\d+)$/);
      if (match) currentMax = parseInt(match[2], 10);

      const riNumber = `RI-${String(currentMax + 1).padStart(3, '0')}`;

      return tx.purchaseIndent.create({
        data: {
          indentId: riNumber,
          timestamp: new Date(),
          firmName,
          generatedBy: generatedBy || null,
          material: rawMaterialName,
          quantity: parseFloat(quantity),
          currentStockAsPerFactory: parseFloat(currentStock),
          priority,
          typeOfIndent,
          deliveryOrderNo: deliveryOrderNo || null,
          notes: notes || null,
          uom,
          expectedRequirementDate: new Date(expectedRequirementDate),
        },
      });
    });

    res.status(201).json({ success: true, data: indent });
  } catch (error) {
    next(error);
  }
};

module.exports = { createIndent };
