const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName } = require('../shared/inventorySync.service');
const { applyMovement } = require('../shared/inventoryMovement.service');

// @desc    Get Stock Adjustments log
// @route   GET /api/inventory/stock-adjustment?firm=&category=
const getStockAdjustments = async (req, res, next) => {
  try {
    const { firm, category } = req.query;
    const whereClause = {};
    if (firm && firm !== 'All') {
      whereClause.firmName = normalizeFirmName(firm);
    }
    if (category) {
      whereClause.category = category;
    }

    const adjustments = await prisma.inventoryStockAdjustment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: adjustments });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Stock Adjustment & apply movement balance update
// @route   POST /api/inventory/stock-adjustment
const createStockAdjustment = async (req, res, next) => {
  try {
    const { date, firmName, category, itemName, qty, direction, remark } = req.body;

    if (!firmName || !category || !itemName || qty === undefined || !direction) {
      res.status(400);
      throw new Error('firmName, category, itemName, qty, and direction are required');
    }

    const normFirm = normalizeFirmName(firmName);
    const quantity = parseFloat(qty);

    const adjustment = await prisma.inventoryStockAdjustment.create({
      data: {
        date: date ? new Date(date) : new Date(),
        firmName: normFirm,
        category,
        itemName: itemName.trim(),
        qty: quantity,
        direction,
        remark: remark || null,
        createdBy: req.user?.username || null,
      },
    });

    // Apply movement to corresponding master model
    const movementType = direction.includes('+') ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REDUCE';
    await applyMovement({
      category,
      firmName: normFirm,
      itemName: itemName.trim(),
      movementType,
      quantity,
      sourceModule: 'manual',
      sourceTable: 'InventoryStockAdjustment',
      sourceId: String(adjustment.id),
    });

    res.status(201).json({ success: true, data: adjustment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockAdjustments,
  createStockAdjustment,
};
