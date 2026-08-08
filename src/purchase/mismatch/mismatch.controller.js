const { prisma } = require('../../config/db');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// @desc    List all mismatch records
// @route   GET /api/purchase/mismatch/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const mismatches = await prisma.purchaseMismatch.findMany({
      include: {
        lift: {
          include: {
            receipt: true,
            lab: true,
            bilty: true,
            indent: {
              select: {
                id: true,
                firmName: true,
                generatePo: { select: { poNumber: true, rate: true, totalQuantity: true } },
                managementApproval: { select: { aluminaPercent: true, ironPercent: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = mismatches.map((m) => {
      const l = m.lift;
      // Progress is tracked by row presence (see schema note), not planned/actual
      // timestamp pairs — a lab result means the lift is fully through the chain
      // and sitting for mismatch triage; a receipt with no lab means it's at Lab;
      // no receipt yet means it's still at Lift.
      const stage = l?.lab ? 'Mismatch' : l?.receipt ? 'Lab' : 'Lift';
      return {
        id: m.id,
        liftId: m.liftId != null ? String(m.liftId) : '',
        liftNo: l?.liftNo || '',
        indentNo: l?.indent?.generatePo?.poNumber || (l?.indentId != null ? String(l.indentId) : ''),
        firmName: m.firmName || l?.firmName || l?.indent?.firmName || '',
        partyName: m.partyName || l?.vendorName || '',
        productName: m.productName || l?.rawMaterialName || '',
        qty: m.qty != null ? String(m.qty) : '',
        type: m.type || l?.type || '',
        billNo: m.billNo || l?.billNo || '',
        areaLifting: m.areaLifting || l?.areaLifting || '',
        truckNo: m.truckNo || l?.truckNo || '',
        transporterName: m.transporterName || l?.transporterName || '',
        biltyNo: m.biltyNo || l?.biltyNo || '',
        biltyImage: m.biltyImage || l?.biltyImage || '',
        billImage: m.billImage || l?.billImage || '',
        weightSlip: l?.receipt?.imageOfWeightSlip || '',
        typeOfRate: m.typeOfRate || l?.typeOfTransportingRate || '',
        rate: m.rate != null ? String(m.rate) : (l?.rate != null ? String(l.rate) : ''),
        truckQty: m.truckQty != null ? String(m.truckQty) : (l?.truckQty != null ? String(l.truckQty) : ''),
        transporterRate: l?.transporterRate != null ? String(l.transporterRate) : '',
        testingCertificate: m.testingCertificate || l?.testingCertificate || '',
        status: m.status || 'Pending',
        remarks: m.remarks || '',
        rateDifference: m.rateDifference != null ? String(m.rateDifference) : '',
        quantityDifference: m.quantityDifference != null ? String(m.quantityDifference) : '',
        diffQty: m.diffQty != null ? String(m.diffQty) : '',
        qtyDiffStatus: m.qtyDiffStatus || '',
        // Expected (PO) values, so the mismatch can be read as expected vs actual.
        poRate: l?.indent?.generatePo?.rate != null ? String(l.indent.generatePo.rate) : '',
        poQuantity: l?.indent?.generatePo?.totalQuantity != null ? String(l.indent.generatePo.totalQuantity) : '',
        aluminaDifference: m.aluminaDifference != null ? String(m.aluminaDifference) : '',
        ironDifference: m.ironDifference != null ? String(m.ironDifference) : '',
        apDifference: m.apDifference != null ? String(m.apDifference) : '',
        bdDifference: m.bdDifference != null ? String(m.bdDifference) : '',
        actionType: m.actionType || '',
        coordinationStatus: m.coordinationStatus || '',
        // Joined data
        actualQuantity: l?.receipt?.actualQuantity != null ? String(l.receipt.actualQuantity) : '',
        labStatus: l?.lab?.status || '',
        labAlumina: l?.lab?.aluminaPercent != null ? String(l.lab.aluminaPercent) : '',
        labIron: l?.lab?.ironPercent != null ? String(l.lab.ironPercent) : '',
        poAlumina: l?.indent?.managementApproval?.aluminaPercent != null ? String(l.indent.managementApproval.aluminaPercent) : '',
        poIron: l?.indent?.managementApproval?.ironPercent != null ? String(l.indent.managementApproval.ironPercent) : '',
        stage,
        createdAt: m.createdAt ? m.createdAt.toISOString() : '',
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update mismatch status/remarks/action
// @route   POST /api/purchase/mismatch/update/:mismatchId
// @access  Private
const updateMismatch = async (req, res, next) => {
  try {
    const mismatchId = Number(req.params.mismatchId);
    if (!Number.isFinite(mismatchId)) {
      res.status(400);
      throw new Error('Invalid mismatchId');
    }

    const {
      status,
      remarks,
      actionType,
      coordinationStatus,
      quantityDifference,
      diffQty,
      qtyDiffStatus,
      firmName,
      partyName,
      productName,
      qty,
      rate,
      billNo,
      billImage,
      transporterName,
      truckNo,
      areaLifting,
      biltyNo,
      biltyImage,
      typeOfRate,
      truckQty,
      totalFreight,
    } = req.body;

    await prisma.purchaseMismatch.update({
      where: { id: mismatchId },
      data: {
        status: status ?? undefined,
        remarks: remarks ?? undefined,
        actionType: actionType ?? undefined,
        coordinationStatus: coordinationStatus ?? undefined,
        quantityDifference: quantityDifference != null && quantityDifference !== '' ? num(quantityDifference) : undefined,
        diffQty: diffQty != null && diffQty !== '' ? num(diffQty) : undefined,
        qtyDiffStatus: qtyDiffStatus ?? undefined,
        firmName: firmName ?? undefined,
        partyName: partyName ?? undefined,
        productName: productName ?? undefined,
        qty: qty != null && qty !== '' ? num(qty) : undefined,
        rate: rate != null && rate !== '' ? num(rate) : undefined,
        billNo: billNo ?? undefined,
        billImage: billImage ?? undefined,
        transporterName: transporterName ?? undefined,
        truckNo: truckNo ?? undefined,
        areaLifting: areaLifting ?? undefined,
        biltyNo: biltyNo ?? undefined,
        biltyImage: biltyImage ?? undefined,
        typeOfRate: typeOfRate ?? undefined,
        truckQty: truckQty != null && truckQty !== '' ? num(truckQty) : undefined,
        totalFreight: totalFreight != null && totalFreight !== '' ? num(totalFreight) : undefined,
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert mismatch (delete mismatch record)
// @route   POST /api/purchase/mismatch/revert
// @access  Private
const revertMismatch = async (req, res, next) => {
  try {
    const { liftId } = req.body;
    if (!liftId) {
      res.status(400);
      throw new Error('Lift ID is required');
    }

    const liftIdNum = Number(liftId);

    // Mismatch is the final stage, so no next stage to check.
    const existingMismatch = await prisma.purchaseMismatch.findFirst({ where: { liftId: liftIdNum } });
    if (!existingMismatch) {
      res.status(404);
      throw new Error('Mismatch record not found for this lift');
    }

    // Delete all mismatches for this lift
    await prisma.purchaseMismatch.deleteMany({ where: { liftId: liftIdNum } });

    res.status(200).json({
      success: true,
      message: 'Mismatch successfully reverted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, updateMismatch, revertMismatch };
