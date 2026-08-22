const { prisma } = require('../../config/db');

// @desc    List lifts requiring unload approval
// @route   GET /api/purchase/unload-approval/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    // Show receipts where unloadApprovalRequired = 'Yes' and approval not yet given
    const receipts = await prisma.purchaseReceipt.findMany({
      where: { unloadApprovalRequired: 'Yes' },
      include: {
        lift: {
          include: {
            mismatches: true,
            indent: { select: { id: true, firmName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pending = [];
    const history = [];

    for (const r of receipts) {
      const l = r.lift;
      if (!l) continue;

      const base = {
        receiptId: r.id,
        liftId: l.id,
        liftNo: l.liftNo || '',
        indentNo: l.indentId != null ? String(l.indentId) : '',
        firmName: l.firmName || l.indent?.firmName || '',
        vendorName: l.vendorName || '',
        rawMaterialName: l.rawMaterialName || '',
        liftingQty: l.liftingQty != null ? String(l.liftingQty) : '',
        actualQuantity: r.actualQuantity != null ? String(r.actualQuantity) : '',
        physicalCondition: r.physicalCondition || '',
        unloadApprovalRequired: r.unloadApprovalRequired || '',
        unloadApprovalStatus: r.unloadApprovalStatus || '',
        unloadApprovalRemarks: r.unloadApprovalRemarks || '',
        unloadApprovalBy: r.unloadApprovalBy || '',
      };

      if (!r.unloadApprovalStatus) {
        pending.push(base);
      } else {
        history.push({
          ...base,
          canRevert: !(l.mismatches && l.mismatches.length > 0),
        });
      }
    }

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit unload approval decision
// @route   POST /api/purchase/unload-approval/submit
// @access  Private
const submitUnloadApproval = async (req, res, next) => {
  try {
    const { receiptId, unloadApprovalStatus, unloadApprovalRemarks, unloadApprovalBy } = req.body;

    if (!receiptId) {
      res.status(400);
      throw new Error('receiptId is required');
    }

    await prisma.purchaseReceipt.update({
      where: { id: Number(receiptId) },
      data: {
        unloadApprovalStatus: unloadApprovalStatus || null,
        unloadApprovalRemarks: unloadApprovalRemarks || null,
        unloadApprovalBy: unloadApprovalBy || null,
        unloadApprovalTrigger: new Date().toISOString(),
      },
      include: { lift: true },
    });

    // Raw Material's Actual Level picks this receipt up live via
    // getRawMaterialReceipts() once unloadApprovalStatus === 'Completed' — no
    // ledger write needed here (see receipt.controller.js for the matching
    // note on the 'not required' path).

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert unload approval (delete from unload stage)
// @route   POST /api/purchase/unload-approval/revert
// @access  Private
const revertUnloadApproval = async (req, res, next) => {
  try {
    const { liftId } = req.body;
    if (!liftId) {
      res.status(400);
      throw new Error('Lift ID is required');
    }

    const liftIdNum = Number(liftId);

    // Check if it has moved to next stage (Mismatch)
    const existingMismatch = await prisma.purchaseMismatch.findFirst({ where: { liftId: liftIdNum } });
    if (existingMismatch) {
      res.status(400);
      throw new Error('Cannot revert. This lift has already been processed in Mismatch. Please revert it from Mismatch first.');
    }

    // The approval decision actually lives on PurchaseReceipt (see
    // submitUnloadApproval above) — there is no separate PurchaseUnloadApproval
    // row to delete; reset the receipt's approval fields instead.
    const existingReceipt = await prisma.purchaseReceipt.findUnique({ where: { liftId: liftIdNum } });
    if (!existingReceipt || !existingReceipt.unloadApprovalStatus) {
      res.status(404);
      throw new Error('Unload Approval record not found for this lift');
    }

    await prisma.purchaseReceipt.update({
      where: { liftId: liftIdNum },
      data: {
        unloadApprovalStatus: null,
        unloadApprovalRemarks: null,
        unloadApprovalBy: null,
        unloadApprovalTrigger: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Unload Approval record successfully reverted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitUnloadApproval, revertUnloadApproval };
