const { prisma } = require('../../config/db');

// @desc    Order receipts eligible for PI (accounts-cleared) + existing PI records
//          (used by "Make PI" page — frontend groups receipts by PO and subtracts
//          already-raised pi_quantity per matching poNumber to compute remaining qty)
// @route   GET /api/order/pi/pending
// @access  Public
const listPendingPiGroups = async (req, res, next) => {
  try {
    const receipts = await prisma.orderReceipt.findMany({
      where: { receivedAccounts: { isNot: null } },
      orderBy: { id: 'desc' },
    });
    const piRecords = await prisma.orderPiRecord.findMany({
      select: { poNumber: true, piQuantity: true, status: true },
    });
    res.json({ success: true, data: { receipts, piRecords } });
  } catch (error) {
    next(error);
  }
};

// @desc    All PI records with their payment/reschedule logs
//          (used by "Received PI Payment" page — frontend groups by po_number
//          into Overdue/Pending/Received tabs)
// @route   GET /api/order/pi
// @access  Public
const listPiRecords = async (req, res, next) => {
  try {
    const rows = await prisma.orderPiRecord.findMany({
      orderBy: { id: 'desc' },
      include: { paymentLogs: true, rescheduleLogs: true },
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new PI record — generates PI-YYYYMMDD-NNNN
// @route   POST /api/order/pi
// @access  Private
const createPi = async (req, res, next) => {
  try {
    const {
      poNumber, poIds, partyName, firmName, piType, productNames,
      totalPoValue, expectedAmount, piQuantity, dueDate, notes, piCopy,
    } = req.body;

    if (!poNumber || !partyName || !firmName || !dueDate || !piQuantity) {
      res.status(400);
      throw new Error('poNumber, partyName, firmName, dueDate and piQuantity are required.');
    }

    const totalPoValueNum = parseFloat(totalPoValue) || 0;
    const expectedAmountNum = Math.round(parseFloat(expectedAmount) || 0);
    const slabPct = totalPoValueNum > 0 ? Math.round((parseFloat(expectedAmount || 0) / totalPoValueNum) * 100) : 0;

    const pi = await prisma.$transaction(async (tx) => {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const piNumber = `PI-${datePart}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      return tx.orderPiRecord.create({
        data: {
          poNumber,
          poIds: (poIds || []).map((id) => parseInt(id, 10)),
          piNumber,
          partyName,
          firmName,
          piType: piType || null,
          productNames: productNames || [],
          slabLabel: 'Manual PI',
          slabPct,
          totalPoValue: totalPoValueNum,
          expectedAmount: expectedAmountNum,
          piQuantity: parseFloat(piQuantity) || 0,
          dueDate: new Date(dueDate),
          notes: notes || null,
          status: 'Pending',
          piCopy: piCopy || null,
        },
      });
    });

    res.status(201).json({ success: true, data: pi });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a PI record fully received, logging the final payment
// @route   POST /api/order/pi/:id/mark-received
// @access  Private
const markReceived = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid PI record id.');
    }

    const { amount, date, remarks } = req.body;
    if (amount === undefined || amount === null || !date) {
      res.status(400);
      throw new Error('amount and date are required.');
    }

    const rec = await prisma.orderPiRecord.findUnique({ where: { id } });
    if (!rec) {
      res.status(404);
      throw new Error('PI record not found.');
    }

    const newActual = (rec.actualAmount || 0) + parseFloat(amount);

    const [updated] = await prisma.$transaction([
      prisma.orderPiRecord.update({
        where: { id },
        data: {
          status: 'Received',
          actualAmount: newActual,
          receivedDate: new Date(date),
          receivedAt: new Date(),
          remarks: remarks || rec.remarks,
        },
      }),
      prisma.orderPiPaymentLog.create({
        data: { piRecordId: id, amount: parseFloat(amount), date: new Date(date), remarks: remarks || null, type: 'final' },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a partial payment against a PI record
// @route   POST /api/order/pi/:id/partial-payment
// @access  Private
const markPartial = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid PI record id.');
    }

    const { amount, date, remarks } = req.body;
    if (amount === undefined || amount === null || !date) {
      res.status(400);
      throw new Error('amount and date are required.');
    }

    const rec = await prisma.orderPiRecord.findUnique({ where: { id } });
    if (!rec) {
      res.status(404);
      throw new Error('PI record not found.');
    }

    const newActual = (rec.actualAmount || 0) + parseFloat(amount);
    const status = (rec.expectedAmount || 0) - newActual <= 0.01 ? 'Received' : 'Partial';

    const [updated] = await prisma.$transaction([
      prisma.orderPiRecord.update({
        where: { id },
        data: {
          status,
          actualAmount: newActual,
          receivedDate: new Date(date),
          receivedAt: new Date(),
          remarks: remarks || rec.remarks,
        },
      }),
      prisma.orderPiPaymentLog.create({
        data: { piRecordId: id, amount: parseFloat(amount), date: new Date(date), remarks: remarks || null, type: 'partial' },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule a PI record's due date, logging the change
// @route   POST /api/order/pi/:id/reschedule
// @access  Private
const reschedule = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid PI record id.');
    }

    const { newDueDate, note } = req.body;
    if (!newDueDate) {
      res.status(400);
      throw new Error('newDueDate is required.');
    }

    const rec = await prisma.orderPiRecord.findUnique({ where: { id } });
    if (!rec) {
      res.status(404);
      throw new Error('PI record not found.');
    }

    const [updated] = await prisma.$transaction([
      prisma.orderPiRecord.update({ where: { id }, data: { dueDate: new Date(newDueDate) } }),
      prisma.orderPiRescheduleLog.create({
        data: { piRecordId: id, fromDate: rec.dueDate, toDate: new Date(newDueDate), note: note || null },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPendingPiGroups,
  listPiRecords,
  createPi,
  markReceived,
  markPartial,
  reschedule,
};
