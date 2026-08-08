const { prisma } = require('../../config/db');
const { seedPurchaserCoordinate } = require('../shared/purchaserCoordinate');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const round = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;

// @desc    List all lifts awaiting receipt + already processed receipts
// @route   GET /api/purchase/receipt/data
// @access  Public
const listData = async (req, res, next) => {
  try {
    const lifts = await prisma.purchaseLift.findMany({
      include: {
        receipt: true,
        lab: true,
        indent: {
          select: {
            id: true,
            firmName: true,
            deliveryOrderNo: true,
            poEntry: { select: { createdAt: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const pending = [];
    const history = [];

    for (const l of lifts) {
      // Only show lifts that have a corresponding poEntry (i.e. lift is confirmed)
      if (!l.indent?.poEntry) continue;

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
        dateOfBill: l.dateOfBill ? l.dateOfBill.toISOString() : '',
        areaLifting: l.areaLifting || '',
        type: l.type || '',
        truckNo: l.truckNo || '',
        driverNo: l.driverNo || '',
        biltyNo: l.biltyNo || '',
        typeOfTransportingRate: l.typeOfTransportingRate || '',
        rate: l.rate != null ? String(l.rate) : '',
        billImage: l.billImage || '',
        biltyImage: l.biltyImage || '',
        transporterRate: l.transporterRate != null ? String(l.transporterRate) : '',
        transporterName: l.transporterName || '',
        orderCancelQty: '0',
        plannedDate: l.indent?.poEntry?.createdAt ? l.indent.poEntry.createdAt.toISOString() : '',
        totalBagsQty: l.receipt?.totalBagsQty != null ? String(l.receipt.totalBagsQty) : '',
      };

      if (!l.receipt) {
        // No receipt yet — goes into awaiting list
        pending.push(base);
      } else {
        // Has receipt — goes into history
        history.push({
          ...base,
          receiptId: l.receipt.id,
          dateOfReceiving: l.receipt.dateOfReceiving ? l.receipt.dateOfReceiving.toISOString() : '',
          totalBillQuantity: l.receipt.totalBillQuantity != null ? String(l.receipt.totalBillQuantity) : '',
          actualQuantity: l.receipt.actualQuantity != null ? String(l.receipt.actualQuantity) : '',
          totalBagsQty: l.receipt.totalBagsQty != null ? String(l.receipt.totalBagsQty) : '',
          physicalCondition: l.receipt.physicalCondition || '',
          moisture: l.receipt.moisture || '',
          physicalImageOfProduct: l.receipt.physicalImageOfProduct || '',
          imageOfWeightSlip: l.receipt.imageOfWeightSlip || '',
          unloadApprovalRequired: l.receipt.unloadApprovalRequired || '',
          unloadApprovalStatus: l.receipt.unloadApprovalStatus || '',
          canRevert: !l.lab,
        });
      }
    }

    res.json({ success: true, data: { pending, history } });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit receipt for a lift
// @route   POST /api/purchase/receipt/submit
// @access  Private
const submitReceipt = async (req, res, next) => {
  try {
    const {
      liftId,
      dateOfReceiving,
      totalBillQuantity,
      actualQuantity,
      totalBagsQty,
      physicalCondition,
      moisture,
      physicalImageOfProduct,
      imageOfWeightSlip,
      unloadApprovalRequired,
    } = req.body;

    if (!liftId) {
      res.status(400);
      throw new Error('liftId is required');
    }

    const liftIdNum = Number(liftId);
    if (!Number.isFinite(liftIdNum)) {
      res.status(400);
      throw new Error('Invalid liftId');
    }

    // Check if receipt already exists
    const existing = await prisma.purchaseReceipt.findUnique({
      where: { liftId: liftIdNum },
    });

    if (existing) {
      res.status(400);
      throw new Error('Receipt already submitted for this lift');
    }

    const receipt = await prisma.purchaseReceipt.create({
      data: {
        liftId: liftIdNum,
        dateOfReceiving: dateOfReceiving ? new Date(dateOfReceiving) : null,
        totalBillQuantity: totalBillQuantity != null && totalBillQuantity !== '' ? num(totalBillQuantity) : null,
        actualQuantity: actualQuantity != null && actualQuantity !== '' ? num(actualQuantity) : null,
        totalBagsQty: totalBagsQty != null && totalBagsQty !== '' ? num(totalBagsQty) : null,
        physicalCondition: physicalCondition || null,
        moisture: moisture || null,
        physicalImageOfProduct: physicalImageOfProduct || null,
        imageOfWeightSlip: imageOfWeightSlip || null,
        unloadApprovalRequired: unloadApprovalRequired || 'No',
      },
    });

    // Reference flags a quantity mismatch whenever the billed (truck) quantity
    // and the physically received quantity diverge by more than a tolerance
    // band — 5% for a vendor-billed rate, 10% for a transporter "to pay" rate
    // (trucks routinely carry 9-40 MT, so treat qty > 500 as already-KG figures).
    const actQty = actualQuantity != null && actualQuantity !== '' ? num(actualQuantity) : null;
    if (actQty != null) {
      const lift = await prisma.purchaseLift.findUnique({
        where: { id: liftIdNum },
        include: { indent: { select: { generatePo: { select: { poNumber: true } } } } },
      });
      const billQty = num(lift?.truckQty ?? lift?.liftingQty ?? lift?.qty ?? 0);
      if (billQty > 0) {
        const diff = round(actQty - billQty);
        const rateTypeStr = String(lift?.typeOfTransportingRate || '').toUpperCase();
        const liftTypeStr = String(lift?.type || '').toUpperCase();
        const isTransporter = rateTypeStr.includes('TO PAY') || liftTypeStr.includes('TRANSPORTER');
        const isKG = billQty > 500;
        const multiplier = isKG ? 1000 : 1;
        const tolerance = isTransporter ? -0.1 * multiplier : -0.05 * multiplier;
        const qtyDiffStatus = diff < tolerance ? 'Mismatch' : 'Match';

        if (qtyDiffStatus === 'Mismatch') {
          const existingMismatch = await prisma.purchaseMismatch.findFirst({ where: { liftId: liftIdNum } });
          const mismatch = existingMismatch
            ? await prisma.purchaseMismatch.update({
                where: { id: existingMismatch.id },
                data: { quantityDifference: diff, diffQty: diff, qtyDiffStatus },
              })
            : await prisma.purchaseMismatch.create({
                data: {
                  liftId: liftIdNum,
                  timestamp: new Date(),
                  firmName: lift.firmName || null,
                  partyName: lift.vendorName || null,
                  productName: lift.rawMaterialName || null,
                  qty: lift.liftingQty || null,
                  quantityDifference: diff,
                  diffQty: diff,
                  qtyDiffStatus,
                  status: 'Pending',
                },
              });

          if (!existingMismatch) {
            await seedPurchaserCoordinate(prisma, {
              mismatchId: mismatch.id,
              poNumber: lift.indent?.generatePo?.poNumber || (lift.indentId != null ? String(lift.indentId) : ''),
              vendorName: lift.vendorName || null,
              transporterName: lift.transporterName || null,
              materialName: lift.rawMaterialName || null,
              type: 'Make Debit Note',
            });
          }
        }
      }
    }

    res.status(201).json({ success: true, data: { receiptId: receipt.id } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing receipt (super-admin edit)
// @route   POST /api/purchase/receipt/update/:receiptId
// @access  Private
const updateReceipt = async (req, res, next) => {
  try {
    const receiptId = Number(req.params.receiptId);
    if (!Number.isFinite(receiptId)) {
      res.status(400);
      throw new Error('Invalid receiptId');
    }

    const {
      dateOfReceiving,
      totalBillQuantity,
      actualQuantity,
      totalBagsQty,
      physicalCondition,
      moisture,
      physicalImageOfProduct,
      imageOfWeightSlip,
      unloadApprovalRequired,
    } = req.body;

    await prisma.purchaseReceipt.update({
      where: { id: receiptId },
      data: {
        dateOfReceiving: dateOfReceiving ? new Date(dateOfReceiving) : undefined,
        totalBillQuantity: totalBillQuantity != null && totalBillQuantity !== '' ? num(totalBillQuantity) : undefined,
        actualQuantity: actualQuantity != null && actualQuantity !== '' ? num(actualQuantity) : undefined,
        totalBagsQty: totalBagsQty != null && totalBagsQty !== '' ? num(totalBagsQty) : undefined,
        physicalCondition: physicalCondition ?? undefined,
        moisture: moisture ?? undefined,
        physicalImageOfProduct: physicalImageOfProduct ?? undefined,
        imageOfWeightSlip: imageOfWeightSlip ?? undefined,
        unloadApprovalRequired: unloadApprovalRequired ?? undefined,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert receipt (delete from receipt stage)
// @route   POST /api/purchase/receipt/revert
// @access  Private
const revertReceipt = async (req, res, next) => {
  try {
    const { liftId } = req.body;
    if (!liftId) {
      res.status(400);
      throw new Error('Lift ID is required');
    }

    const liftIdNum = Number(liftId);

    // Check if it has moved to next stage (Lab)
    const existingLab = await prisma.purchaseLab.findUnique({ where: { liftId: liftIdNum } });
    if (existingLab) {
      res.status(400);
      throw new Error('Cannot revert. This lift has already been processed in the Lab stage. Please revert it from Lab first.');
    }

    // Delete receipt
    const existingReceipt = await prisma.purchaseReceipt.findUnique({ where: { liftId: liftIdNum } });
    if (!existingReceipt) {
      res.status(404);
      throw new Error('Receipt not found for this lift');
    }

    await prisma.purchaseReceipt.delete({ where: { liftId: liftIdNum } });

    res.status(200).json({
      success: true,
      message: 'Receipt successfully reverted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listData, submitReceipt, updateReceipt, revertReceipt };
