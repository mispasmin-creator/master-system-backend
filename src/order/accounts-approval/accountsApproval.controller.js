const { prisma } = require('../../config/db');
const { upsertStageAndStampParent } = require('../shared/stageChain');

const PAYMENT_TERM_STATUSES = ['Followed', 'Not Followed'];

// @desc    Logistics splits awaiting Accounts Approval (status === 'Dispatched')
// @route   GET /api/order/accounts-approval/pending
// @access  Public
const listPending = async (req, res, next) => {
  try {
    const splits = await prisma.orderLogisticsSplit.findMany({
      where: { status: 'Dispatched' },
      include: { dispatchRecord: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: splits });
  } catch (error) {
    next(error);
  }
};

// @desc    Logistics splits with a completed Accounts Approval
// @route   GET /api/order/accounts-approval/history
// @access  Public
const listHistory = async (req, res, next) => {
  try {
    const splits = await prisma.orderLogisticsSplit.findMany({
      where: { status: { in: ['Accounts Approved', 'Logistic Completed'] } },
      include: { dispatchRecord: true, receipt: true },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: splits });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a batch of dispatched logistics splits — records the
//          payment-term status for each split's dispatch and flips the
//          split's own status to 'Accounts Approved' (mirrored so the
//          Logistic page can read it back read-only).
// @route   POST /api/order/accounts-approval/approve
// @access  Private
const approve = async (req, res, next) => {
  try {
    const { splitIds, paymentTermStatus, remarks } = req.body;

    if (!Array.isArray(splitIds) || splitIds.length === 0) {
      res.status(400);
      throw new Error('splitIds is required.');
    }
    if (!PAYMENT_TERM_STATUSES.includes(paymentTermStatus)) {
      res.status(400);
      throw new Error("paymentTermStatus must be 'Followed' or 'Not Followed'.");
    }
    if (paymentTermStatus === 'Not Followed' && !remarks) {
      res.status(400);
      throw new Error('Remarks are required when Payment Term Status is Not Followed.');
    }

    const finalRemarks = paymentTermStatus === 'Not Followed' ? remarks : null;

    const result = await prisma.$transaction(async (tx) => {
      const approved = [];

      for (const rawSplitId of splitIds) {
        const splitId = parseInt(rawSplitId, 10);
        if (Number.isNaN(splitId)) continue;

        const split = await tx.orderLogisticsSplit.findUnique({ where: { id: splitId } });
        if (!split || !split.dispatchRecordId || split.status !== 'Dispatched') continue;

        await upsertStageAndStampParent(tx, {
          model: tx.orderAccountsApproval,
          where: { dispatchId: split.dispatchRecordId },
          create: { dispatchId: split.dispatchRecordId, splitId: split.id, paymentTermStatus, remarks: finalRemarks },
          update: { splitId: split.id, paymentTermStatus, remarks: finalRemarks },
          parentModel: tx.orderDispatch,
          parentWhere: { id: split.dispatchRecordId },
        });

        const updatedSplit = await tx.orderLogisticsSplit.update({
          where: { id: split.id },
          data: { status: 'Accounts Approved', paymentTermStatus, accountsRemarks: finalRemarks },
        });

        approved.push(updatedSplit);
      }

      return approved;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPending, listHistory, approve };
