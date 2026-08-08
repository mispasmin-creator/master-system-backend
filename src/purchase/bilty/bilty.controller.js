const { prisma } = require('../../config/db');

// @desc    List all lifts awaiting bilty + completed bilty records
// @route   GET /api/purchase/bilty/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const lifts = await prisma.purchaseLift.findMany({
      include: {
        receipt: true,
        lab: true,
        bilty: true,
        unloadApproval: true,
        indent: { select: { id: true, firmName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    const pending = [];
    const history = [];

    for (const l of lifts) {
      // Bilty is only relevant after lab test is done (or if lab was skipped/passed)
      if (!l.receipt) continue;

      const base = {
        id: l.id,
        liftNo: l.liftNo || '',
        indentNo: l.indentId != null ? String(l.indentId) : '',
        firmName: l.firmName || l.indent?.firmName || '',
        vendorName: l.vendorName || '',
        rawMaterialName: l.rawMaterialName || '',
        liftingQty: l.liftingQty != null ? String(l.liftingQty) : '',
        billNo: l.billNo || '',
        biltyNo: l.biltyNo || '',
        biltyImage: l.biltyImage || '',
        truckNo: l.truckNo || '',
        transporterName: l.transporterName || '',
        areaLifting: l.areaLifting || '',
        rate: l.rate != null ? String(l.rate) : '',
        labStatus: l.lab?.status || '',
        dateOfReceiving: l.receipt.dateOfReceiving ? l.receipt.dateOfReceiving.toISOString() : '',
      };

      if (!l.bilty) {
        pending.push(base);
      } else {
        history.push({
          ...base,
          biltyId: l.bilty.id,
          savedBiltyNo: l.bilty.biltyNo || '',
          savedBiltyImage: l.bilty.biltyImage || '',
          canRevert: !l.unloadApproval,
        });
      }
    }

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit bilty info for a lift
// @route   POST /api/purchase/bilty/submit
// @access  Private
const submitBilty = async (req, res, next) => {
  try {
    const { liftId, biltyNo, biltyImage } = req.body;

    if (!liftId) {
      res.status(400);
      throw new Error('liftId is required');
    }

    const liftIdNum = Number(liftId);
    const existing = await prisma.purchaseBilty.findUnique({ where: { liftId: liftIdNum } });
    if (existing) {
      res.status(400);
      throw new Error('Bilty already submitted for this lift');
    }

    const bilty = await prisma.purchaseBilty.create({
      data: {
        liftId: liftIdNum,
        biltyNo: biltyNo || null,
        biltyImage: biltyImage || null,
      },
    });

    // Also update the lift's biltyNo/biltyImage if they were missing
    if (biltyNo || biltyImage) {
      await prisma.purchaseLift.update({
        where: { id: liftIdNum },
        data: {
          biltyNo: biltyNo || undefined,
          biltyImage: biltyImage || undefined,
        },
      });
    }

    res.status(201).json({ success: true, data: { biltyId: bilty.id } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bilty info
// @route   POST /api/purchase/bilty/update/:biltyId
// @access  Private
const updateBilty = async (req, res, next) => {
  try {
    const biltyId = Number(req.params.biltyId);
    if (!Number.isFinite(biltyId)) {
      res.status(400);
      throw new Error('Invalid biltyId');
    }

    const { biltyNo, biltyImage } = req.body;

    await prisma.purchaseBilty.update({
      where: { id: biltyId },
      data: {
        biltyNo: biltyNo ?? undefined,
        biltyImage: biltyImage ?? undefined,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert bilty (delete from bilty stage)
// @route   POST /api/purchase/bilty/revert
// @access  Private
const revertBilty = async (req, res, next) => {
  try {
    const { liftId } = req.body;
    if (!liftId) {
      res.status(400);
      throw new Error('Lift ID is required');
    }

    const liftIdNum = Number(liftId);

    // Check if it has moved to next stage (Unload Approval)
    const existingUnloadApproval = await prisma.purchaseUnloadApproval.findUnique({ where: { liftId: liftIdNum } });
    if (existingUnloadApproval) {
      res.status(400);
      throw new Error('Cannot revert. This lift has already been processed in Unload Approval. Please revert it from Unload Approval first.');
    }

    // Delete bilty record
    const existingBilty = await prisma.purchaseBilty.findUnique({ where: { liftId: liftIdNum } });
    if (!existingBilty) {
      res.status(404);
      throw new Error('Bilty record not found for this lift');
    }

    await prisma.purchaseBilty.delete({ where: { liftId: liftIdNum } });

    // Important: we also need to clear biltyNo and biltyImage from PurchaseLift to reset it properly
    await prisma.purchaseLift.update({
      where: { id: liftIdNum },
      data: {
        biltyNo: null,
        biltyImage: null,
      }
    });

    res.status(200).json({
      success: true,
      message: 'Bilty record successfully reverted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitBilty, updateBilty, revertBilty };
