const { prisma } = require('../../config/db');

// @desc    Get all crushing items
// @route   GET /api/production/crushing-items
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionCrushingItem.findMany();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Find-or-create a crushing item by input product name (dropdown source
//          for the Crushing page — items are just a name list, upserted by name
//          since there's no unique constraint on inputProductName to upsert on).
// @route   POST /api/production/crushing-items
const create = async (req, res, next) => {
  try {
    const { inputProductName } = req.body;
    if (!inputProductName) {
      res.status(400);
      throw new Error('inputProductName is required.');
    }

    const existing = await prisma.productionCrushingItem.findFirst({ where: { inputProductName } });
    const data = existing || await prisma.productionCrushingItem.create({ data: { inputProductName } });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create };
