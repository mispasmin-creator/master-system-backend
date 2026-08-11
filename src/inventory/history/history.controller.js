const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName } = require('../shared/inventorySync.service');

// @desc    Get Inventory Daily History snapshots
// @route   GET /api/inventory/history?firm=&from=&to=&category=
const getHistory = async (req, res, next) => {
  try {
    const { firm, from, to, category } = req.query;
    const normFirm = firm && firm !== 'All' ? normalizeFirmName(firm) : null;

    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const rmWhere = {};
    const fgWhere = {};

    if (normFirm) {
      rmWhere.firmName = normFirm;
      fgWhere.firmName = normFirm;
    }
    if (from || to) {
      rmWhere.snapshotDate = dateFilter;
      fgWhere.snapshotDate = dateFilter;
    }

    let rawMaterialHistory = [];
    let finishedGoodsHistory = [];

    if (!category || category === 'RawMaterial') {
      rawMaterialHistory = await prisma.inventoryRawMaterialHistory.findMany({
        where: rmWhere,
        orderBy: [{ snapshotDate: 'desc' }, { firmName: 'asc' }],
      });
    }

    if (!category || category === 'FinishedGoods') {
      finishedGoodsHistory = await prisma.inventoryFinishedGoodsHistory.findMany({
        where: fgWhere,
        orderBy: [{ snapshotDate: 'desc' }, { firmName: 'asc' }],
      });
    }

    res.json({
      success: true,
      data: {
        rawMaterial: rawMaterialHistory,
        finishedGoods: finishedGoodsHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually trigger daily inventory stock snapshot
// @route   POST /api/inventory/history/snapshot
const triggerSnapshot = async (req, res, next) => {
  try {
    const { date } = req.body;
    const { captureSnapshot } = require('../shared/dailySnapshot.service');
    const result = await captureSnapshot(date || new Date());
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  triggerSnapshot,
};
