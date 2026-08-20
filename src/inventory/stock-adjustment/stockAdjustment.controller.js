const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const { normalizeFirmName } = require('../shared/inventorySync.service');
const { applyMovement } = require('../shared/inventoryMovement.service');

// Old "category" values (RawMaterial | FinishedGoods | TradingMaterial), still sent by the
// frontend/other callers, map onto the real stock_adjustment.material_type enum.
const CATEGORY_TO_MATERIAL_TYPE = {
  RawMaterial: 'raw_material',
  FinishedGoods: 'finish_good',
  TradingMaterial: 'trading_material',
  raw_material: 'raw_material',
  finish_good: 'finish_good',
  trading_material: 'trading_material',
};

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
      whereClause.materialType = CATEGORY_TO_MATERIAL_TYPE[category] || category;
    }

    const adjustments = await prisma.inventoryStockAdjustment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = adjustments.map((adj) => ({
      id: adj.id,
      entry_date: adj.entryDate,
      firm_name: adj.firmName,
      material_type: adj.materialType,
      // Back-compat aliases for older callers still expecting these names
      category: adj.materialType,
      item_name: adj.itemName,
      qty: adj.qty,
      status: adj.status,
      direction: adj.status,
      remark: adj.remark,
      rate: adj.rate,
      created_at: adj.createdAt,
    }));

    res.json({ success: true, data: formatted });
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
    const materialType = CATEGORY_TO_MATERIAL_TYPE[category] || category;

    const adjustment = await prisma.inventoryStockAdjustment.create({
      data: {
        entryDate: date ? new Date(date) : new Date(),
        firmName: normFirm,
        materialType,
        itemName: itemName.trim(),
        qty: quantity,
        status: direction,
        remark: remark || null,
      },
    });

    // Log the movement (used for cross-module sync dedup elsewhere)
    const movementType = direction.includes('+') ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REDUCE';
    await applyMovement({
      category,
      firmName: normFirm,
      itemName: itemName.trim(),
      movementType,
      quantity,
      sourceModule: 'manual',
      sourceTable: 'StockAdjustment',
      sourceId: String(adjustment.id),
      skipStockAdjustment: true, // the row above already IS the stock_adjustment entry
    });

    res.status(201).json({ success: true, data: adjustment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Stock Adjustment entry
// @route   PUT /api/inventory/stock-adjustment/:id
const updateStockAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, firmName, category, itemName, qty, direction, remark } = req.body;

    const existing = await prisma.inventoryStockAdjustment.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) {
      res.status(404);
      throw new Error('Stock adjustment entry not found');
    }

    const updateData = {};
    if (date !== undefined) updateData.entryDate = date ? new Date(date) : new Date();
    if (firmName !== undefined) updateData.firmName = normalizeFirmName(firmName);
    if (category !== undefined) updateData.materialType = CATEGORY_TO_MATERIAL_TYPE[category] || category;
    if (itemName !== undefined) updateData.itemName = itemName.trim();
    if (qty !== undefined) updateData.qty = parseFloat(qty);
    if (direction !== undefined) updateData.status = direction;
    if (remark !== undefined) updateData.remark = remark || null;

    const updated = await prisma.inventoryStockAdjustment.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Stock Adjustment entry
// @route   DELETE /api/inventory/stock-adjustment/:id
const deleteStockAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.inventoryStockAdjustment.delete({ where: { id: parseInt(id, 10) } });
    res.json({ success: true, message: 'Adjustment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockAdjustments,
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
};
