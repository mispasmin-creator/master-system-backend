const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

// Ex-Factory shipments skip Bilty/Material-Receipt tracking entirely.
const isExFactory = (typeOfTransporting) => {
  const normalized = (typeOfTransporting || '').replace(/[\s-]/g, '').toLowerCase();
  return normalized === 'exfactory';
};

// @desc    Delivery rows awaiting Bilty Update / Material Receipt
//          (UnifiedLogistics) — no Bilty row yet, excluding Ex-Factory
// @route   GET /api/order/delivery/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const deliveries = await prisma.orderDelivery.findMany({
      where: { bilty: null },
      include: { dispatch: { select: { tcRequired: true } } },
      orderBy: { id: 'asc' },
    });
    const data = deliveries.filter((d) => !isExFactory(d.typeOfTransporting));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delivery rows with a completed Bilty Update / Material Receipt
// @route   GET /api/order/delivery/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const deliveries = await prisma.orderDelivery.findMany({
      where: { bilty: { isNot: null } },
      include: { bilty: true, materialReceipts: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit the combined Bilty + Material Receipt form for a single
//          Delivery row ("UnifiedLogistics" / Bilty Update page). Upserts
//          OrderBilty (1:1, stamps the Delivery row) and hand-upserts
//          OrderMaterialReceipt (no unique constraint on deliveryId).
// @route   POST /api/order/delivery
// @access  Private
const submit = async (req, res, next) => {
  try {
    const { deliveryId, biltyNo, biltyCopy, receiptDate, grnNumber, arrivalProofUrl, totalBillAmount } = req.body;
    const id = parseInt(deliveryId, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid delivery id.');
    }
    if (!receiptDate || !grnNumber) {
      res.status(400);
      throw new Error('Receipt Date and GRN Number are required.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingBilty = await tx.orderBilty.findUnique({ where: { deliveryId: id } });

      // Bilty No. and Bilty Copy are required unless this delivery already
      // has a Bilty row with a copy on file.
      if (!biltyNo || (!biltyCopy && !existingBilty?.biltyCopy)) {
        const err = new Error('Bilty No. and Bilty Copy are required.');
        err.statusCode = 400;
        throw err;
      }

      const biltyUpdateData = { biltyNo };
      if (biltyCopy) biltyUpdateData.biltyCopy = biltyCopy;

      const bilty = await upsertStageAndStampParent(tx, {
        model: tx.orderBilty,
        where: { deliveryId: id },
        create: { deliveryId: id, biltyNo, biltyCopy: biltyCopy || null },
        update: biltyUpdateData,
        parentModel: tx.orderDelivery,
        parentWhere: { id },
      });

      const delivery = await tx.orderDelivery.findUnique({ where: { id } });
      if (!delivery) {
        const err = new Error('Delivery not found.');
        err.statusCode = 404;
        throw err;
      }

      const receiptData = {
        orderNo: delivery.doNumber,
        billNo: delivery.billNo,
        partyName: delivery.partyName,
        billDate: delivery.billDate,
        totalBillAmount: totalBillAmount ? parseFloat(totalBillAmount) : 0,
        materialReceivedDate: new Date(receiptDate),
        grnNumber,
        imageOfReceivedBillOrAudio: arrivalProofUrl || null,
      };

      const existingReceipt = await tx.orderMaterialReceipt.findFirst({ where: { deliveryId: id } });
      let materialReceipt;
      if (existingReceipt) {
        materialReceipt = await tx.orderMaterialReceipt.update({
          where: { id: existingReceipt.id },
          data: receiptData,
        });
      } else {
        materialReceipt = await tx.orderMaterialReceipt.create({
          data: { ...receiptData, deliveryId: id, timestamp: new Date() },
        });
      }

      return { bilty, materialReceipt, delivery };
    });

    try {
      const { applyMovement } = require('../../inventory/shared/inventoryMovement.service');
      const del = result.delivery;
      if (del && del.productName && (del.quantityDelivered || del.qty)) {
        await applyMovement({
          category: 'FinishedGoods',
          firmName: del.givingFromWhere || '',
          itemName: del.productName,
          movementType: 'SALES',
          quantity: del.quantityDelivered || del.qty || 0,
          sourceModule: 'order',
          sourceTable: 'OrderDelivery',
          sourceId: String(del.id),
        });
      }
    } catch (hookErr) {
      console.error('Inventory movement sync hook error (OrderDelivery):', hookErr.message);
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { listPending, listHistory, submit };
