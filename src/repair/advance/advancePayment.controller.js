const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// GET /api/repair/advance-payments
const getAdvancePayments = async (req, res) => {
  try {
    const { firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }

    if (search) {
      where.OR = [
        { paymentNo: { contains: search, mode: 'insensitive' } },
        { taskNo: { contains: search, mode: 'insensitive' } },
        { machineName: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { billNo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const payments = await prisma.repairAdvancePayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { task: true }
    });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    console.error('getAdvancePayments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/repair/advance-payments
const createAdvancePayment = async (req, res) => {
  try {
    const body = req.body;

    // Generate PN-001 format payment number if not supplied
    let paymentNo = body.paymentNo;
    if (!paymentNo) {
      const count = await prisma.repairAdvancePayment.count();
      paymentNo = `PN-${String(count + 1).padStart(3, '0')}`;
    }

    let taskId = body.taskId || null;
    let taskNo = body.taskNo || body.repairTaskNo || null;

    if (taskNo && !taskId) {
      const existingTask = await prisma.repairTask.findFirst({
        where: { taskNo: taskNo }
      });
      if (existingTask) {
        taskId = existingTask.id;
      }
    }

    const payment = await prisma.repairAdvancePayment.create({
      data: {
        paymentNo,
        taskId,
        taskNo,
        firmName: body.firmName || 'Pmmpl',
        serialNo: body.serialNo || null,
        machineName: body.machineName || null,
        vendorName: body.vendorName || null,
        billNo: body.billNo || null,
        totalBillAmount: parseFloat(body.totalBillAmount) || null,
        paymentType: body.paymentType || null,
        toBePaidAmount: parseFloat(body.toBePaidAmount) || null,
        billMatch: body.billMatch || 'No',
        amount: parseFloat(body.amount) || parseFloat(body.toBePaidAmount) || 0,
        paidTo: body.paidTo || body.vendorName || null,
        paymentMode: body.paymentMode || body.paymentType || null,
        remarks: body.remarks || null,
        paidDate: body.paidDate ? new Date(body.paidDate) : new Date()
      }
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error('createAdvancePayment error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAdvancePayments,
  createAdvancePayment
};
