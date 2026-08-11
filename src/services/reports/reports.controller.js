const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// GET /api/services/reports/dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const { firm } = req.query;
    const jobWhere = firm && firm !== 'All' ? { firmName: firm } : {};
    const offerWhere = firm && firm !== 'All' ? { firmName: firm } : {};
    const utilityWhere = firm && firm !== 'All' ? { firmName: firm } : {};

    const [jobs, offers, utilities] = await Promise.all([
      prisma.serviceJob.findMany({ where: jobWhere }),
      prisma.serviceOffer.findMany({ where: offerWhere }),
      prisma.serviceUtility.findMany({ where: utilityWhere })
    ]);

    let totalJobAmount = 0;
    let pendingJobsCount = 0;
    let completedJobsCount = 0;
    const statusCounts = {};

    jobs.forEach(j => {
      const amt = Number(j.amount) || 0;
      totalJobAmount += amt;
      const st = j.status || 'Service Created';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      if (st === 'Completed') {
        completedJobsCount++;
      } else {
        pendingJobsCount++;
      }
    });

    let totalOfferAmount = 0;
    offers.forEach(o => {
      totalOfferAmount += Number(o.amount) || 0;
    });

    let totalUtilityAmount = 0;
    utilities.forEach(u => {
      totalUtilityAmount += Number(u.amount) || 0;
    });

    res.json({
      success: true,
      data: {
        totalJobs: jobs.length,
        pendingJobsCount,
        completedJobsCount,
        totalJobAmount,
        totalOffers: offers.length,
        totalOfferAmount,
        totalUtilities: utilities.length,
        totalUtilityAmount,
        statusCounts
      }
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/services/reports/pending
const getPendingWorkSummary = async (req, res) => {
  try {
    const { firm } = req.query;
    const where = {
      status: { not: 'Completed' }
    };
    if (firm && firm !== 'All') {
      where.firmName = firm;
    }

    const pendingJobs = await prisma.serviceJob.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const pendingUtilities = await prisma.serviceUtility.findMany({
      where: {
        status: { notIn: ['Completed', 'Paid'] },
        ...(firm && firm !== 'All' ? { firmName: firm } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        pendingJobs,
        pendingUtilities
      }
    });
  } catch (err) {
    console.error('getPendingWorkSummary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getDashboardSummary,
  getPendingWorkSummary
};
