const { prisma } = require('../../config/db');
const { seedPurchaserCoordinate } = require('../shared/purchaserCoordinate');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// @desc    List all lifts awaiting lab + completed lab reports
// @route   GET /api/purchase/lab/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const lifts = await prisma.purchaseLift.findMany({
      include: {
        receipt: true,
        lab: true,
        bilty: true,
        indent: {
          select: {
            id: true,
            firmName: true,
            managementApproval: { select: { aluminaPercent: true, ironPercent: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const pending = [];
    const history = [];

    for (const l of lifts) {
      // Lab testing only applies after receipt is done
      if (!l.receipt) continue;

      const base = {
        id: l.id,
        liftNo: l.liftNo || '',
        indentNo: l.indentId != null ? String(l.indentId) : '',
        firmName: l.firmName || l.indent?.firmName || '',
        vendorName: l.vendorName || '',
        rawMaterialName: l.rawMaterialName || '',
        qty: l.qty != null ? String(l.qty) : '',
        liftingQty: l.liftingQty != null ? String(l.liftingQty) : '',
        billNo: l.billNo || '',
        rate: l.rate != null ? String(l.rate) : '',
        areaLifting: l.areaLifting || '',
        transporterName: l.transporterName || '',
        truckNo: l.truckNo || '',
        biltyNo: l.biltyNo || '',
        biltyImage: l.biltyImage || '',
        billImage: l.billImage || '',
        dateOfReceiving: l.receipt.dateOfReceiving ? l.receipt.dateOfReceiving.toISOString() : '',
        actualQuantity: l.receipt.actualQuantity != null ? String(l.receipt.actualQuantity) : '',
        physicalCondition: l.receipt.physicalCondition || '',
        aluminaTarget: l.indent?.managementApproval?.aluminaPercent != null ? String(l.indent.managementApproval.aluminaPercent) : '',
        ironTarget: l.indent?.managementApproval?.ironPercent != null ? String(l.indent.managementApproval.ironPercent) : '',
      };

      if (!l.lab) {
        pending.push(base);
      } else {
        history.push({
          ...base,
          labId: l.lab.id,
          status: l.lab.status || '',
          dateOfTest: l.lab.dateOfTest ? l.lab.dateOfTest.toISOString() : '',
          moisturePercent: l.lab.moisturePercent != null ? String(l.lab.moisturePercent) : '',
          bdPercent: l.lab.bdPercent != null ? String(l.lab.bdPercent) : '',
          apPercent: l.lab.apPercent != null ? String(l.lab.apPercent) : '',
          aluminaPercent: l.lab.aluminaPercent != null ? String(l.lab.aluminaPercent) : '',
          ironPercent: l.lab.ironPercent != null ? String(l.lab.ironPercent) : '',
          sieveAnalysis: l.lab.sieveAnalysis != null ? String(l.lab.sieveAnalysis) : '',
          loiPercent: l.lab.loiPercent != null ? String(l.lab.loiPercent) : '',
          sio2Percent: l.lab.sio2Percent != null ? String(l.lab.sio2Percent) : '',
          caoPercent: l.lab.caoPercent != null ? String(l.lab.caoPercent) : '',
          mgoPercent: l.lab.mgoPercent != null ? String(l.lab.mgoPercent) : '',
          tio2Percent: l.lab.tio2Percent != null ? String(l.lab.tio2Percent) : '',
          k2oNa2oPercent: l.lab.k2oNa2oPercent != null ? String(l.lab.k2oNa2oPercent) : '',
          freeIronPercent: l.lab.freeIronPercent != null ? String(l.lab.freeIronPercent) : '',
          reason: l.lab.reason || '',
          canRevert: !l.bilty,
        });
      }
    }

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit lab test result
// @route   POST /api/purchase/lab/submit
// @access  Private
const submitLab = async (req, res, next) => {
  try {
    const {
      liftId,
      status,
      dateOfTest,
      moisturePercent,
      bdPercent,
      apPercent,
      aluminaPercent,
      ironPercent,
      sieveAnalysis,
      loiPercent,
      sio2Percent,
      caoPercent,
      mgoPercent,
      tio2Percent,
      k2oNa2oPercent,
      freeIronPercent,
      reason,
    } = req.body;

    if (!liftId) {
      res.status(400);
      throw new Error('liftId is required');
    }

    const liftIdNum = Number(liftId);

    const existing = await prisma.purchaseLab.findUnique({ where: { liftId: liftIdNum } });
    if (existing) {
      res.status(400);
      throw new Error('Lab result already submitted for this lift');
    }

    const lift = await prisma.purchaseLift.findUnique({
      where: { id: liftIdNum },
      include: {
        indent: {
          select: {
            managementApproval: { select: { aluminaPercent: true, ironPercent: true } },
            generatePo: { select: { poNumber: true } },
          },
        },
      },
    });

    const lab = await prisma.purchaseLab.create({
      data: {
        liftId: liftIdNum,
        status: status || null,
        dateOfTest: dateOfTest ? new Date(dateOfTest) : null,
        moisturePercent: num(moisturePercent),
        bdPercent: num(bdPercent),
        apPercent: num(apPercent),
        aluminaPercent: num(aluminaPercent),
        ironPercent: num(ironPercent),
        sieveAnalysis: num(sieveAnalysis),
        loiPercent: num(loiPercent),
        sio2Percent: num(sio2Percent),
        caoPercent: num(caoPercent),
        mgoPercent: num(mgoPercent),
        tio2Percent: num(tio2Percent),
        k2oNa2oPercent: num(k2oNa2oPercent),
        freeIronPercent: num(freeIronPercent),
        reason: reason || null,
      },
    });

    // If lab result is 'Fail', seed a mismatch row for lab discrepancy
    if (status === 'Fail' && lift) {
      const targetAlumina = lift.indent?.managementApproval?.aluminaPercent;
      const targetIron = lift.indent?.managementApproval?.ironPercent;
      const actAlumina = num(aluminaPercent);
      const actIron = num(ironPercent);

      const aluminaDiff = targetAlumina != null && actAlumina != null ? Number((targetAlumina - actAlumina).toFixed(3)) : null;
      const ironDiff = targetIron != null && actIron != null ? Number((actIron - targetIron).toFixed(3)) : null;

      const existingMismatch = await prisma.purchaseMismatch.findFirst({ where: { liftId: liftIdNum } });

      const mismatch = existingMismatch
        ? await prisma.purchaseMismatch.update({
            where: { id: existingMismatch.id },
            data: { aluminaDifference: aluminaDiff, ironDifference: ironDiff },
          })
        : await prisma.purchaseMismatch.create({
            data: {
              liftId: liftIdNum,
              timestamp: new Date(),
              firmName: lift.firmName || null,
              partyName: lift.vendorName || null,
              productName: lift.rawMaterialName || null,
              qty: lift.liftingQty || null,
              aluminaDifference: aluminaDiff,
              ironDifference: ironDiff,
              status: 'Pending',
            },
          });

      // Failed lab result -> material quality is bad, needs to physically go back.
      if (!existingMismatch) {
        await seedPurchaserCoordinate(prisma, {
          mismatchId: mismatch.id,
          poNumber: lift.indent?.generatePo?.poNumber || (lift.indentId != null ? String(lift.indentId) : ''),
          vendorName: lift.vendorName || null,
          transporterName: lift.transporterName || null,
          materialName: lift.rawMaterialName || null,
          type: 'Return Material and Make Debit Note',
        });
      }
    }

    res.status(201).json({ success: true, data: { labId: lab.id } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing lab result (super-admin edit)
// @route   POST /api/purchase/lab/update/:labId
// @access  Private
const updateLab = async (req, res, next) => {
  try {
    const labId = Number(req.params.labId);
    if (!Number.isFinite(labId)) {
      res.status(400);
      throw new Error('Invalid labId');
    }

    const {
      status,
      dateOfTest,
      moisturePercent,
      bdPercent,
      apPercent,
      aluminaPercent,
      ironPercent,
      sieveAnalysis,
      loiPercent,
      sio2Percent,
      caoPercent,
      mgoPercent,
      tio2Percent,
      k2oNa2oPercent,
      freeIronPercent,
      reason,
    } = req.body;

    await prisma.purchaseLab.update({
      where: { id: labId },
      data: {
        status: status ?? undefined,
        dateOfTest: dateOfTest ? new Date(dateOfTest) : undefined,
        moisturePercent: moisturePercent != null && moisturePercent !== '' ? num(moisturePercent) : undefined,
        bdPercent: bdPercent != null && bdPercent !== '' ? num(bdPercent) : undefined,
        apPercent: apPercent != null && apPercent !== '' ? num(apPercent) : undefined,
        aluminaPercent: aluminaPercent != null && aluminaPercent !== '' ? num(aluminaPercent) : undefined,
        ironPercent: ironPercent != null && ironPercent !== '' ? num(ironPercent) : undefined,
        sieveAnalysis: sieveAnalysis != null && sieveAnalysis !== '' ? num(sieveAnalysis) : undefined,
        loiPercent: loiPercent != null && loiPercent !== '' ? num(loiPercent) : undefined,
        sio2Percent: sio2Percent != null && sio2Percent !== '' ? num(sio2Percent) : undefined,
        caoPercent: caoPercent != null && caoPercent !== '' ? num(caoPercent) : undefined,
        mgoPercent: mgoPercent != null && mgoPercent !== '' ? num(mgoPercent) : undefined,
        tio2Percent: tio2Percent != null && tio2Percent !== '' ? num(tio2Percent) : undefined,
        k2oNa2oPercent: k2oNa2oPercent != null && k2oNa2oPercent !== '' ? num(k2oNa2oPercent) : undefined,
        freeIronPercent: freeIronPercent != null && freeIronPercent !== '' ? num(freeIronPercent) : undefined,
        reason: reason ?? undefined,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert lab test (delete from lab stage)
// @route   POST /api/purchase/lab/revert
// @access  Private
const revertLab = async (req, res, next) => {
  try {
    const { liftId } = req.body;
    if (!liftId) {
      res.status(400);
      throw new Error('Lift ID is required');
    }

    const liftIdNum = Number(liftId);

    // Check if it has moved to next stage (Bilty)
    const existingBilty = await prisma.purchaseBilty.findUnique({ where: { liftId: liftIdNum } });
    if (existingBilty) {
      res.status(400);
      throw new Error('Cannot revert. This lift has already been processed in the Bilty stage. Please revert it from Bilty first.');
    }

    // Delete lab record
    const existingLab = await prisma.purchaseLab.findUnique({ where: { liftId: liftIdNum } });
    if (!existingLab) {
      res.status(404);
      throw new Error('Lab record not found for this lift');
    }

    await prisma.purchaseLab.delete({ where: { liftId: liftIdNum } });

    res.status(200).json({
      success: true,
      message: 'Lab record successfully reverted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitLab, updateLab, revertLab };
