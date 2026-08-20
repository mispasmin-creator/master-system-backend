const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeFirmName,
  normalizeItemKey,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
  getRawMaterialReceipts,
  getProductionConsumption,
  getStockAdjustmentTotals,
} = require('../shared/inventorySync.service');
const { finishedGoodCurrentLevel } = require('../shared/inventoryFormulas');

// @desc    Get Finished Goods Inventory
// @route   GET /api/inventory/finished-goods?firm=&search=&page=&pageSize=
const getFinishedGoods = async (req, res, next) => {
  try {
    const { firm, search, page = 1, pageSize = 100 } = req.query;
    const normFirm = firm && firm !== 'All' ? normalizeFirmName(firm) : null;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(pageSize, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {};
    if (normFirm) {
      whereClause.firmName = normFirm;
    }
    if (search) {
      whereClause.productName = { contains: search, mode: 'insensitive' };
    }

    const [
      items,
      totalCount,
      liveProduction,
      liveDispatches,
      livePending,
      liveMatReturns,
      livePurchReturns,
      liveReceipts,
      liveConsumption,
      adjustmentTotals,
    ] = await Promise.all([
      prisma.inventoryFinishGoods.findMany({
        where: whereClause,
        orderBy: [{ firmName: 'asc' }, { productName: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.inventoryFinishGoods.count({ where: whereClause }),
      getFinishedGoodProduction(normFirm || ''),
      getFinishedGoodDispatch(normFirm || ''),
      getFinishedGoodPendingOrders(normFirm || ''),
      getMaterialReturns(normFirm || ''),
      getPurchaseReturns(normFirm || ''),
      getRawMaterialReceipts(normFirm || ''),
      getProductionConsumption(normFirm || ''),
      getStockAdjustmentTotals('finish_good', normFirm || undefined),
    ]);

    const formattedData = items.map((item) => {
      const normKey = normalizeItemKey(item.productName);
      const prodQty = liveProduction[normKey]?.quantityFg || 0;
      const salesQty = liveDispatches[normKey]?.quantity || 0;
      const pendingQty = livePending[normKey]?.pendingQuantity || 0;
      const salesRetQty = liveMatReturns[normKey]?.quantity || 0;
      const purchRetQty = livePurchReturns[normKey]?.quantity || 0;
      const purchRecQty = liveReceipts[normKey]?.quantity || 0;
      const consumptionQty = liveConsumption[normKey]?.quantity || 0;
      const adjustmentQty = adjustmentTotals[normKey] || 0;

      const calcCurrentLevel = finishedGoodCurrentLevel(
        item.opStock,
        purchRecQty,
        prodQty,
        adjustmentQty,
        salesQty,
        salesRetQty,
        consumptionQty,
        purchRetQty
      );

      return {
        id: item.id,
        firm_name: item.firmName,
        product_name: item.productName,
        op_stock: item.opStock,
        op_stock_date: item.opStockDate,
        stock_adjustment: adjustmentQty,
        sales_order_pending: pendingQty,
        purchase_material_received: purchRecQty,
        purchase_return: purchRetQty,
        production: prodQty,
        sales: salesQty,
        sales_return: salesRetQty,
        consumption: consumptionQty,
        current_level: calcCurrentLevel,
        created_at: item.createdAt,
      };
    });

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add Finished Goods Item
// @route   POST /api/inventory/finished-goods
const createFinishedGood = async (req, res, next) => {
  try {
    const { firmName, productName, opStock, opStockDate } = req.body;
    if (!firmName || !productName) {
      res.status(400);
      throw new Error('firmName and productName are required');
    }

    const normFirm = normalizeFirmName(firmName);

    const item = await prisma.inventoryFinishGoods.create({
      data: {
        firmName: normFirm,
        productName: productName.trim(),
        opStock: parseFloat(opStock) || 0,
        opStockDate: opStockDate ? new Date(opStockDate) : null,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Finished Goods Item
// @route   PUT /api/inventory/finished-goods/:id
const updateFinishedGood = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { opStock, opStockDate } = req.body;

    const existing = await prisma.inventoryFinishGoods.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) {
      res.status(404);
      throw new Error('Finished good item not found');
    }

    const updateData = {};
    if (opStock !== undefined) updateData.opStock = parseFloat(opStock);
    if (opStockDate !== undefined) updateData.opStockDate = opStockDate ? new Date(opStockDate) : null;

    const updated = await prisma.inventoryFinishGoods.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Finished Goods Item
// @route   DELETE /api/inventory/finished-goods/:id
const deleteFinishedGood = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.inventoryFinishGoods.delete({ where: { id: parseInt(id, 10) } });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFinishedGoods,
  createFinishedGood,
  updateFinishedGood,
  deleteFinishedGood,
};
