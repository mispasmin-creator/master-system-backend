const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// ---------------------------------------------------------------------------
// Advance Payment — reference: Originals-billto-fill.jsx / AdvancePayment.jsx.
//
// Only POs that were created with "Advance To Be Paid" = Yes need this stage
// (reference gates on Planned5, and the PO's Status5 starts "Pending").
// Marking an advance paid records a PurchaseAdvancePayment row (Status5
// "paid", reference: Actual5) and stamps the parent Generate PO's updatedAt.
// Grouped by po_number; the representative (primary) indent carries the row.
// ---------------------------------------------------------------------------

const iso = (d) => (d ? new Date(d).toISOString() : null);

// @desc    Advance-payment-eligible POs, grouped by PO (frontend splits into
//          pending / history from `actual5`).
// @route   GET /api/purchase/advance-payment/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseGeneratePo.findMany({
      where: { advanceToBePaid: 'Yes' },
      include: {
        indent: {
          select: {
            id: true,
            firmName: true,
            material: true,
            deliveryOrderNo: true,
            priority: true,
            advancePayment: { select: { createdAt: true, status5: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const groups = {};
    for (const row of rows) {
      const indent = row.indent;
      if (!indent) continue;
      const poNumber = String(row.poNumber || indent.id || '').trim();
      if (!poNumber) continue;

      if (!groups[poNumber]) {
        groups[poNumber] = { primary: row, materials: new Set(), totalPOQty: 0 };
      }
      const g = groups[poNumber];
      if (indent.material) g.materials.add(String(indent.material).trim());
      g.totalPOQty += parseFloat(row.totalQuantity ?? row.approvedQty ?? 0) || 0;
    }

    const data = Object.entries(groups).map(([poNumber, g]) => {
      const row = g.primary;
      const indent = row.indent;
      const paid = !!indent.advancePayment;
      return {
        _id: `adv-pay-${indent.id}`,
        dbIndentId: indent.id,
        indentId: poNumber,
        firmName: indent.firmName || '',
        poNumber,
        deliveryOrderNo: indent.deliveryOrderNo || '',
        vendorName: row.vendorName || '',
        rawMaterialName: Array.from(g.materials).filter(Boolean).join(', '),
        approvedQty: String(g.totalPOQty || ''),
        advanceAmount: String(row.toBePaidAmount ?? ''),
        totalAmount: String(row.totalAmount ?? ''),
        typeOfIndent: String(indent.priority || ''),
        poCopyLink: row.poCopy || '',
        notes: row.poNotes || '',
        planned: iso(row.createdAt),
        planned5: iso(row.createdAt),
        actual: iso(indent.advancePayment?.createdAt),
        actual5: iso(indent.advancePayment?.createdAt),
        status: paid ? 'paid' : row.status5 || 'Pending',
        paymentLink: '',
        dbRowIds: [indent.id],
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a PO's advance as paid.
// @route   POST /api/purchase/advance-payment/mark-paid
// @access  Private
const markPaid = async (req, res, next) => {
  try {
    const { indentId } = req.body;
    const id = Number(indentId);
    if (!id) {
      res.status(400);
      throw new Error('Cannot update: entry id is missing.');
    }

    await prisma.$transaction((tx) => upsertStageAndStampParent(tx, {
      model: tx.purchaseAdvancePayment,
      where: { indentId: id },
      create: { indentId: id, status5: 'paid' },
      update: { status5: 'paid' },
      parentModel: tx.purchaseGeneratePo,
      parentWhere: { indentId: id },
    }));

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, markPaid };
