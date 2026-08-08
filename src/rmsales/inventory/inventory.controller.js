const { prisma } = require('../../config/db');

// @desc    Get all inventory with computed remainingQty
// @route   GET /api/rmsales/inventory
const getAll = async (req, res, next) => {
  try {
    const rows = await prisma.rmSalesInventory.findMany({
      include: {
        product: true,
      },
      orderBy: { id: 'desc' },
    });

    const data = rows.map((row) => ({
      ...row,
      remainingQty: (row.availableQty ?? 0) - (row.soldQty ?? 0),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };
