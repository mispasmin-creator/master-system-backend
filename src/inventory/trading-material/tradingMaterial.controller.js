const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeFirmName,
  getRawMaterialReceipts,
  getFinishedGoodDispatch,
  getMaterialReturns,
  getPurchaseReturns,
} = require('../shared/inventorySync.service');
const { tradingMaterialCurrentLevel } = require('../shared/inventoryFormulas');

// @desc    Get Trading Material Inventory
// @route   GET /api/inventory/trading-material?firm=&search=&page=&pageSize=
const getTradingMaterial = async (req, res, next) => {
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

    const [items, totalCount, liveReceipts, liveDispatches, liveMatReturns, livePurchReturns] =
      await Promise.all([
        prisma.inventoryTradingMaterial.findMany({
          where: whereClause,
          orderBy: [{ firmName: 'asc' }, { sNo: 'asc' }],
          skip,
          take: limitNum,
        }),
        prisma.inventoryTradingMaterial.count({ where: whereClause }),
        getRawMaterialReceipts(normFirm || ''),
        getFinishedGoodDispatch(normFirm || ''),
        getMaterialReturns(normFirm || ''),
        getPurchaseReturns(normFirm || ''),
      ]);

    const formattedData = items.map((item) => {
      const normKey = item.productName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const purchRec = liveReceipts[normKey]?.quantity || item.purchaseMaterialReceived || 0;
      const salesQty = liveDispatches[normKey]?.quantity || item.sales || 0;
      const salesRetQty = liveMatReturns[normKey]?.quantity || item.salesReturn || 0;
      const purchRetQty = livePurchReturns[normKey]?.quantity || item.purchaseReturn || 0;

      const calcCurrentLevel = tradingMaterialCurrentLevel(
        item.opStock,
        item.stockAdjustment,
        purchRec,
        purchRetQty,
        salesQty,
        salesRetQty
      );

      return {
        id: item.id,
        s_no: item.sNo,
        firm_name: item.firmName,
        product_name: item.productName,
        unit: item.unit || '',
        op_stock: item.opStock,
        op_stock_date: item.opStockDate,
        stock_adjustment: item.stockAdjustment,
        purchase_material_received: purchRec,
        purchase_return: purchRetQty,
        sales: salesQty,
        sales_return: salesRetQty,
        current_level: calcCurrentLevel,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
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

// @desc    Add Trading Material Item
// @route   POST /api/inventory/trading-material
const createTradingMaterial = async (req, res, next) => {
  try {
    const { firmName, productName, unit, opStock, opStockDate, stockAdjustment, sNo } = req.body;
    if (!firmName || !productName) {
      res.status(400);
      throw new Error('firmName and productName are required');
    }

    const normFirm = normalizeFirmName(firmName);

    const item = await prisma.inventoryTradingMaterial.create({
      data: {
        firmName: normFirm,
        productName: productName.trim(),
        unit: unit || '',
        opStock: parseFloat(opStock) || 0,
        opStockDate: opStockDate ? new Date(opStockDate) : null,
        stockAdjustment: parseFloat(stockAdjustment) || 0,
        currentLevel: parseFloat(opStock) || 0,
        sNo: sNo ? parseInt(sNo, 10) : null,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Trading Material Item
// @route   PUT /api/inventory/trading-material/:id
const updateTradingMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { unit, opStock, opStockDate, stockAdjustment, sNo } = req.body;

    const existing = await prisma.inventoryTradingMaterial.findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Trading material item not found');
    }

    const updateData = {};
    if (unit !== undefined) updateData.unit = unit;
    if (opStock !== undefined) updateData.opStock = parseFloat(opStock);
    if (opStockDate !== undefined) updateData.opStockDate = opStockDate ? new Date(opStockDate) : null;
    if (stockAdjustment !== undefined) updateData.stockAdjustment = parseFloat(stockAdjustment);
    if (sNo !== undefined) updateData.sNo = parseInt(sNo, 10);

    const updated = await prisma.inventoryTradingMaterial.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Trading Material Item
// @route   DELETE /api/inventory/trading-material/:id
const deleteTradingMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.inventoryTradingMaterial.delete({ where: { id } });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTradingMaterial,
  createTradingMaterial,
  updateTradingMaterial,
  deleteTradingMaterial,
};
