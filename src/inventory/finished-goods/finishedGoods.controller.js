const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeFirmName,
  getFinishedGoodProduction,
  getFinishedGoodDispatch,
  getFinishedGoodPendingOrders,
  getMaterialReturns,
  getPurchaseReturns,
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

    const [items, totalCount, liveProduction, liveDispatches, livePending, liveMatReturns, livePurchReturns] =
      await Promise.all([
        prisma.inventoryFinishedGoods.findMany({
          where: whereClause,
          orderBy: [{ firmName: 'asc' }, { sNo: 'asc' }],
          skip,
          take: limitNum,
        }),
        prisma.inventoryFinishedGoods.count({ where: whereClause }),
        getFinishedGoodProduction(normFirm || ''),
        getFinishedGoodDispatch(normFirm || ''),
        getFinishedGoodPendingOrders(normFirm || ''),
        getMaterialReturns(normFirm || ''),
        getPurchaseReturns(normFirm || ''),
      ]);

    const formattedData = items.map((item) => {
      const normKey = item.productName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const prodQty = liveProduction[normKey]?.quantityFg || item.production || 0;
      const salesQty = liveDispatches[normKey]?.quantity || item.sales || 0;
      const pendingQty = livePending[normKey]?.pendingQuantity || item.salesOrderPending || 0;
      const salesRetQty = liveMatReturns[normKey]?.quantity || item.salesReturn || 0;
      const purchRetQty = livePurchReturns[normKey]?.quantity || item.purchaseReturn || 0;

      const calcCurrentLevel = finishedGoodCurrentLevel(
        item.opStock,
        item.purchaseMaterialReceived,
        prodQty,
        item.stockAdjustment,
        salesQty,
        salesRetQty,
        item.consumption,
        purchRetQty
      );

      return {
        id: item.id,
        s_no: item.sNo,
        firm_name: item.firmName,
        product_name: item.productName,
        op_stock: item.opStock,
        op_stock_date: item.opStockDate,
        stock_adjustment: item.stockAdjustment,
        sales_order_pending: pendingQty,
        purchase_material_received: item.purchaseMaterialReceived,
        lift_material: item.liftMaterial,
        in_transit: item.inTransit,
        purchase_return: purchRetQty,
        production: prodQty,
        sales: salesQty,
        sales_return: salesRetQty,
        consumption: item.consumption,
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

// @desc    Add Finished Goods Item
// @route   POST /api/inventory/finished-goods
const createFinishedGood = async (req, res, next) => {
  try {
    const { firmName, productName, opStock, opStockDate, stockAdjustment, sNo } = req.body;
    if (!firmName || !productName) {
      res.status(400);
      throw new Error('firmName and productName are required');
    }

    const normFirm = normalizeFirmName(firmName);

    const item = await prisma.inventoryFinishedGoods.create({
      data: {
        firmName: normFirm,
        productName: productName.trim(),
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

// @desc    Update Finished Goods Item
// @route   PUT /api/inventory/finished-goods/:id
const updateFinishedGood = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { opStock, opStockDate, stockAdjustment, sNo } = req.body;

    const existing = await prisma.inventoryFinishedGoods.findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Finished good item not found');
    }

    const updateData = {};
    if (opStock !== undefined) updateData.opStock = parseFloat(opStock);
    if (opStockDate !== undefined) updateData.opStockDate = opStockDate ? new Date(opStockDate) : null;
    if (stockAdjustment !== undefined) updateData.stockAdjustment = parseFloat(stockAdjustment);
    if (sNo !== undefined) updateData.sNo = parseInt(sNo, 10);

    const updated = await prisma.inventoryFinishedGoods.update({
      where: { id },
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
    await prisma.inventoryFinishedGoods.delete({ where: { id } });
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
