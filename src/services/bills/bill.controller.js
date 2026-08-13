const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// GET /api/services/bills?tab=active|history
const getBills = async (req, res) => {
  try {
    const { tab, firm, search } = req.query;
    const isHistory = tab === 'history';

    const where = {
      OR: [
        { billNo: { not: null } },
        { billCopy: { not: null } },
        { paymentFormDone: true }
      ]
    };

    if (isHistory) {
      where.status = 'Completed';
    } else {
      where.status = { not: 'Completed' };
    }

    if (firm && firm !== 'All') {
      where.firmName = firm;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { serviceNo: { contains: search, mode: 'insensitive' } },
            { billNo: { contains: search, mode: 'insensitive' } },
            { vendor: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const bills = await prisma.serviceJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { offer: true }
    });

    res.json({ success: true, count: bills.length, data: bills });
  } catch (err) {
    console.error('getBills error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getBills
};
