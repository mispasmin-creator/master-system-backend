const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { deriveServiceStatus, calculateDelay, generateServiceNo } = require('../shared/serviceStatus.service');

// GET /api/services/jobs?stage=&firm=&search=
const getJobs = async (req, res) => {
  try {
    const { stage, firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }
    if (stage && stage !== 'All') {
      where.status = stage;
    }
    if (search) {
      where.OR = [
        { serviceNo: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { billNo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const jobs = await prisma.serviceJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { offer: true }
    });

    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    console.error('getJobs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/services/jobs
const createJob = async (req, res) => {
  try {
    const body = req.body;
    let serviceNo = body.serviceNo;
    if (!serviceNo) {
      serviceNo = await generateServiceNo();
    }

    const planned1 = body.planned1 ? new Date(body.planned1) : null;
    const actual1 = body.actual1 ? new Date(body.actual1) : null;
    const delay1 = calculateDelay(planned1, actual1);

    const planned2 = body.planned2 ? new Date(body.planned2) : null;
    const actual2 = body.actual2 ? new Date(body.actual2) : null;
    const delay2 = calculateDelay(planned2, actual2);

    const payload = {
      serviceNo: serviceNo,
      offerId: body.offerId || null,
      firmName: body.firmName || 'PMMPL',
      checker: body.checker || null,
      amount: parseFloat(body.amount) || 0,
      tdsAmount: parseFloat(body.tdsAmount) || 0,
      remark: body.remark || null,
      vendor: body.vendor || 'Vendor',
      description: body.description || null,
      location: body.location || null,
      planned1, actual1, delay1,
      billNo: body.billNo || null,
      billCopy: body.billCopy || null,
      planned2, actual2, delay2,
      paymentProof: body.paymentProof || null,
      planned3: body.planned3 ? new Date(body.planned3) : null,
      actual3: body.actual3 ? new Date(body.actual3) : null,
      delay3: body.delay3 ? parseFloat(body.delay3) : null,
      status3: body.status3 || null,
      remarks3: body.remarks3 || null,
      planned4: body.planned4 ? new Date(body.planned4) : null,
      actual4: body.actual4 ? new Date(body.actual4) : null,
      delay4: body.delay4 ? parseFloat(body.delay4) : null,
      status4: body.status4 || null,
      remarks4: body.remarks4 || null,
      planned5: body.planned5 ? new Date(body.planned5) : null,
      actual5: body.actual5 ? new Date(body.actual5) : null,
      delay5: body.delay5 ? parseFloat(body.delay5) : null,
      status5: body.status5 || null,
      remarks5: body.remarks5 || null,
      paymentForm: body.paymentForm || null
    };

    payload.status = deriveServiceStatus(payload);

    const job = await prisma.serviceJob.create({
      data: payload
    });

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    console.error('createJob error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/services/jobs/:id
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.serviceJob.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: `Job with ID '${id}' not found.` });
    }

    const merged = { ...existing, ...body };

    const planned1 = merged.planned1 ? new Date(merged.planned1) : null;
    const actual1 = merged.actual1 ? new Date(merged.actual1) : null;
    const delay1 = calculateDelay(planned1, actual1);

    const planned2 = merged.planned2 ? new Date(merged.planned2) : null;
    const actual2 = merged.actual2 ? new Date(merged.actual2) : null;
    const delay2 = calculateDelay(planned2, actual2);

    const planned3 = merged.planned3 ? new Date(merged.planned3) : null;
    const actual3 = merged.actual3 ? new Date(merged.actual3) : null;
    const delay3 = calculateDelay(planned3, actual3);

    const planned4 = merged.planned4 ? new Date(merged.planned4) : null;
    const actual4 = merged.actual4 ? new Date(merged.actual4) : null;
    const delay4 = calculateDelay(planned4, actual4);

    const planned5 = merged.planned5 ? new Date(merged.planned5) : null;
    const actual5 = merged.actual5 ? new Date(merged.actual5) : null;
    const delay5 = calculateDelay(planned5, actual5);

    const data = {
      ...body,
      planned1, actual1, delay1,
      planned2, actual2, delay2,
      planned3, actual3, delay3,
      planned4, actual4, delay4,
      planned5, actual5, delay5
    };

    data.status = deriveServiceStatus({ ...existing, ...data });

    const job = await prisma.serviceJob.update({
      where: { id },
      data
    });

    res.json({ success: true, data: job });
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getJobs,
  createJob,
  updateJob
};
