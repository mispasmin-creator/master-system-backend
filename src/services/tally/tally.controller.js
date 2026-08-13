const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { deriveServiceStatus, calculateDelay } = require('../shared/serviceStatus.service');

// GET /api/services/tally?tab=audit|rectify|tally|completed
const getTallyJobs = async (req, res) => {
  try {
    const { tab = 'audit', firm, search } = req.query;
    const andConditions = [];

    if (firm && firm !== 'All') {
      andConditions.push({ firmName: firm });
    }

    if (tab === 'audit') {
      andConditions.push({
        OR: [
          { billNo: { not: null, not: '' } },
          { billCopy: { not: null, not: '' } },
          { paymentFormDone: true },
          { actual2: { not: null } },
          { status3: 'Approved' },
          { actual3: { not: null } },
          { status: 'Bill Received' },
          { status: 'Payment Pending' }
        ]
      });
      andConditions.push({
        OR: [
          { status4: null },
          { status4: '' },
          { status4: 'Pending' }
        ]
      });
    } else if (tab === 'rectify') {
      andConditions.push({
        OR: [
          { status4: 'Rectify' },
          { status4: 'Rejected' },
          { status4: 'Pending Rectification' }
        ]
      });
    } else if (tab === 'tally') {
      andConditions.push({
        OR: [
          { status4: 'Completed' },
          { status4: 'Paid' },
          { status: 'Tally Pending' },
          { actual4: { not: null } }
        ]
      });
      andConditions.push({
        OR: [
          { status5: null },
          { status5: '' },
          { status5: 'Pending' }
        ]
      });
    } else if (tab === 'completed') {
      andConditions.push({
        OR: [
          { status5: 'Completed' },
          { status: 'Completed' },
          { actual5: { not: null } }
        ]
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { serviceNo: { contains: search, mode: 'insensitive' } },
          { vendor: { contains: search, mode: 'insensitive' } },
          { billNo: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const jobs = await prisma.serviceJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { offer: true }
    });

    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    console.error('getTallyJobs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/services/tally/:id/advance
const advanceTallyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planned4, actual4, status4, remarks4,
      planned5, actual5, status5, remarks5,
      paymentForm
    } = req.body;

    const existing = await prisma.serviceJob.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: `Job with ID '${id}' not found.` });
    }

    const data = {};
    if (planned4 !== undefined) data.planned4 = planned4 ? new Date(planned4) : null;
    if (actual4 !== undefined) data.actual4 = actual4 ? new Date(actual4) : null;
    if (data.planned4 || data.actual4 || existing.planned4) {
      data.delay4 = calculateDelay(data.planned4 || existing.planned4, data.actual4 || existing.actual4);
    }
    if (status4 !== undefined) data.status4 = status4;
    if (remarks4 !== undefined) data.remarks4 = remarks4;

    if (planned5 !== undefined) data.planned5 = planned5 ? new Date(planned5) : null;
    if (actual5 !== undefined) data.actual5 = actual5 ? new Date(actual5) : null;
    if (data.planned5 || data.actual5 || existing.planned5) {
      data.delay5 = calculateDelay(data.planned5 || existing.planned5, data.actual5 || existing.actual5);
    }
    if (status5 !== undefined) data.status5 = status5;
    if (remarks5 !== undefined) data.remarks5 = remarks5;
    if (paymentForm !== undefined) data.paymentForm = paymentForm;

    const merged = { ...existing, ...data };
    data.status = deriveServiceStatus(merged);

    const updatedJob = await prisma.serviceJob.update({
      where: { id },
      data
    });

    res.json({ success: true, data: updatedJob });
  } catch (err) {
    console.error('advanceTallyJob error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getTallyJobs,
  advanceTallyJob
};
