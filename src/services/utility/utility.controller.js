const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { calculateDelay } = require('../shared/serviceStatus.service');

// GET /api/services/utility
const getUtilities = async (req, res) => {
  try {
    const { firm, search, status } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { utilityNo: { contains: search, mode: 'insensitive' } },
        { payTo: { contains: search, mode: 'insensitive' } },
        { fmsName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } }
      ];
    }

    const utilities = await prisma.serviceUtility.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: utilities.length, data: utilities });
  } catch (err) {
    console.error('getUtilities error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/services/utility
const createUtility = async (req, res) => {
  try {
    const body = req.body;
    let utilityNo = body.utilityNo;
    if (!utilityNo) {
      const count = await prisma.serviceUtility.count();
      utilityNo = `UT-${String(count + 1).padStart(3, '0')}`;
    }

    const amount = parseFloat(body.amount) || 0;
    const tdsAmount = parseFloat(body.tdsAmount) || 0;
    const amountPaid = parseFloat(body.amountPaid) || (amount - tdsAmount);
    const outstanding = parseFloat(body.outstanding) || (amount - tdsAmount - amountPaid);

    const planned1 = body.planned1 ? new Date(body.planned1) : null;
    const actual1 = body.actual1 ? new Date(body.actual1) : null;
    const delay1 = calculateDelay(planned1, actual1);

    const planned2 = body.planned2 ? new Date(body.planned2) : null;
    const actual2 = body.actual2 ? new Date(body.actual2) : null;
    const delay2 = calculateDelay(planned2, actual2);

    const utility = await prisma.serviceUtility.create({
      data: {
        utilityNo: utilityNo,
        firmName: body.firmName || 'PMMPL',
        personName: body.personName || null,
        userName: body.userName || null,
        department: body.department || null,
        groupHead: body.groupHead || null,
        payTo: body.payTo || 'Payee',
        amount,
        billImage: body.billImage || null,
        billDate: body.billDate ? new Date(body.billDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        remarks: body.remarks || null,
        tdsAmount,
        amountPaid,
        outstanding,
        status: body.status || 'Pending Approval',
        planned1, actual1, delay1,
        planned2, actual2, delay2,
        paymentFormLink: body.paymentFormLink || null,
        fmsName: body.fmsName || null,
        details: body.details || null,
        approvalAttachment: body.approvalAttachment || null,
        paymentNo: body.paymentNo || null,
        paymentMode: body.paymentMode || null,
        transactionRef: body.transactionRef || null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentAttachment: body.paymentAttachment || null,
        paymentRemarks: body.paymentRemarks || null
      }
    });

    res.status(201).json({ success: true, data: utility });
  } catch (err) {
    console.error('createUtility error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/services/utility/:id
const updateUtility = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.serviceUtility.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: `ServiceUtility with ID '${id}' not found.` });
    }

    const data = { ...body };
    if (body.billDate !== undefined) data.billDate = body.billDate ? new Date(body.billDate) : null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.paymentDate !== undefined) data.paymentDate = body.paymentDate ? new Date(body.paymentDate) : null;

    if (body.planned1 !== undefined) data.planned1 = body.planned1 ? new Date(body.planned1) : null;
    if (body.actual1 !== undefined) data.actual1 = body.actual1 ? new Date(body.actual1) : null;
    if (data.planned1 || data.actual1) {
      data.delay1 = calculateDelay(data.planned1 || existing.planned1, data.actual1 || existing.actual1);
    }

    if (body.planned2 !== undefined) data.planned2 = body.planned2 ? new Date(body.planned2) : null;
    if (body.actual2 !== undefined) data.actual2 = body.actual2 ? new Date(body.actual2) : null;
    if (data.planned2 || data.actual2) {
      data.delay2 = calculateDelay(data.planned2 || existing.planned2, data.actual2 || existing.actual2);
    }

    const utility = await prisma.serviceUtility.update({
      where: { id },
      data
    });

    res.json({ success: true, data: utility });
  } catch (err) {
    console.error('updateUtility error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /api/services/utility/:id/approve
const approveUtility = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalAttachment, fmsName, details, remarks, status } = req.body;

    const actual1 = new Date();
    const existing = await prisma.serviceUtility.findUnique({ where: { id } });
    const delay1 = existing ? calculateDelay(existing.planned1, actual1) : 0;

    const utility = await prisma.serviceUtility.update({
      where: { id },
      data: {
        status: status || 'Approved',
        approvalAttachment: approvalAttachment || undefined,
        fmsName: fmsName || undefined,
        details: details || undefined,
        remarks: remarks || undefined,
        actual1,
        delay1
      }
    });

    res.json({ success: true, data: utility });
  } catch (err) {
    console.error('approveUtility error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /api/services/utility/:id/pay
const payUtility = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentNo, paymentMode, transactionRef, paymentDate, paymentAttachment, paymentRemarks, status } = req.body;

    const actual2 = paymentDate ? new Date(paymentDate) : new Date();
    const existing = await prisma.serviceUtility.findUnique({ where: { id } });
    const delay2 = existing ? calculateDelay(existing.planned2, actual2) : 0;

    const utility = await prisma.serviceUtility.update({
      where: { id },
      data: {
        status: status || 'Completed',
        paymentNo: paymentNo || undefined,
        paymentMode: paymentMode || undefined,
        transactionRef: transactionRef || undefined,
        paymentDate: actual2,
        paymentAttachment: paymentAttachment || undefined,
        paymentRemarks: paymentRemarks || undefined,
        actual2,
        delay2,
        outstanding: 0
      }
    });

    res.json({ success: true, data: utility });
  } catch (err) {
    console.error('payUtility error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getUtilities,
  createUtility,
  updateUtility,
  approveUtility,
  payUtility
};
