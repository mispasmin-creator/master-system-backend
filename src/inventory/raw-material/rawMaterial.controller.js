const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeFirmName,
  normalizeItemKey,
  getRawMaterialReceipts,
  getProductionConsumption,
  getPurchaseReturns,
  getStockAdjustmentTotals,
  getCrushingFlows,
  getSemiProductionFlows,
  getRawMaterialSales,
} = require('../shared/inventorySync.service');
const { getRateCascade } = require('../shared/rateCascade.service');
const { dailyConsumption, colour, stockTotal, optimumStockTotal, rawMaterialActualLevel } = require('../shared/inventoryFormulas');

// @desc    Get Raw Material Inventory
// @route   GET /api/inventory/raw-material?firm=&search=&page=&pageSize=
const getRawMaterial = async (req, res, next) => {
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
      whereClause.itemName = { contains: search, mode: 'insensitive' };
    }

    const [
      items,
      totalCount,
      liveReceipts,
      liveRates,
      liveConsumptions,
      liveSales,
      livePurchReturns,
      adjustmentTotals,
      crushingFlows,
      semiFlows,
    ] = await Promise.all([
      prisma.inventoryRawMaterial.findMany({
        where: whereClause,
        orderBy: [{ firmName: 'asc' }, { itemName: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.inventoryRawMaterial.count({ where: whereClause }),
      getRawMaterialReceipts(normFirm || ''),
      getRateCascade(normFirm || ''),
      getProductionConsumption(normFirm || ''),
      getRawMaterialSales(normFirm || ''),
      getPurchaseReturns(normFirm || ''),
      getStockAdjustmentTotals('raw_material', normFirm || undefined),
      getCrushingFlows(normFirm || ''),
      getSemiProductionFlows(normFirm || ''),
    ]);

    const formattedData = items.map((item) => {
      const normItemKey = normalizeItemKey(item.itemName);
      const purchaseQty = liveReceipts[normItemKey]?.quantity || 0;
      const salesQty = liveSales[normItemKey]?.quantity || 0;
      const purchReturnQty = livePurchReturns[normItemKey]?.quantity || 0;
      const liveRate = liveRates[normItemKey] || 0;
      const adjustmentQty = adjustmentTotals[normItemKey] || 0;

      const consumptionQty =
        (liveConsumptions[normItemKey]?.quantity || 0) +
        (crushingFlows.consumption[normItemKey]?.quantity || 0) +
        (semiFlows.consumption[normItemKey]?.quantity || 0);

      const productionOutputQty =
        (crushingFlows.production[normItemKey]?.quantity || 0) +
        (semiFlows.production[normItemKey]?.quantity || 0);

      const actualLevel = rawMaterialActualLevel(
        item.opStock,
        adjustmentQty,
        purchaseQty,
        consumptionQty,
        purchReturnQty,
        salesQty,
        productionOutputQty
      );

      const dailyCon = dailyConsumption(item.annuCon);
      const optStockTotal = optimumStockTotal(item.optimumQty, liveRate);
      const stkTotal = stockTotal(actualLevel, liveRate);
      const colFlag = colour(actualLevel, item.maxQty, item.optimumQty);

      return {
        id: item.id,
        firm_name: item.firmName,
        item_name: item.itemName,
        unit: item.unit || '',
        op_stock: item.opStock,
        op_stock_date: item.opStockDate,
        stock_adjustment: adjustmentQty,
        actual_level: actualLevel,
        product_rate: liveRate,
        annual_consumption: item.annuCon,
        annu_con: item.annuCon,
        safety_factor: item.safetyFactor,
        lead_time_days: item.leadTimeDays,
        daily_consumption: dailyCon,
        optimum_stock: item.optimumQty,
        optimum_qty: item.optimumQty,
        max_stock: item.maxQty,
        max_qty: item.maxQty,
        optimum_stock_total: optStockTotal,
        stock_total: stkTotal,
        colour: colFlag,
        purchase_system: purchaseQty,
        purchase_return: purchReturnQty,
        production_consumption: consumptionQty,
        production_output: productionOutputQty,
        raw_material_sales: salesQty,
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

// @desc    Add Raw Material Item
// @route   POST /api/inventory/raw-material
const createRawMaterial = async (req, res, next) => {
  try {
    const {
      firmName,
      itemName,
      unit,
      opStock,
      opStockDate,
      annualConsumption,
      annuCon,
      safetyFactor,
      leadTimeDays,
      optimumQty,
      maxQty,
    } = req.body;

    if (!firmName || !itemName) {
      res.status(400);
      throw new Error('firmName and itemName are required');
    }

    const normFirm = normalizeFirmName(firmName);

    const item = await prisma.inventoryRawMaterial.create({
      data: {
        firmName: normFirm,
        itemName: itemName.trim(),
        unit: unit || 'MT',
        opStock: parseFloat(opStock) || 0,
        opStockDate: opStockDate ? new Date(opStockDate) : null,
        annuCon: parseFloat(annuCon ?? annualConsumption) || 0,
        safetyFactor: parseFloat(safetyFactor) || 1,
        leadTimeDays: parseFloat(leadTimeDays) || 0,
        optimumQty: parseFloat(optimumQty) || 0,
        maxQty: parseFloat(maxQty) || 0,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Raw Material Item
// @route   PUT /api/inventory/raw-material/:id
const updateRawMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      unit,
      opStock,
      opStockDate,
      annualConsumption,
      annuCon,
      safetyFactor,
      leadTimeDays,
      optimumQty,
      maxQty,
    } = req.body;

    const existing = await prisma.inventoryRawMaterial.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) {
      res.status(404);
      throw new Error('Raw material item not found');
    }

    const updateData = { updatedAt: new Date() };
    if (unit !== undefined) updateData.unit = unit;
    if (opStock !== undefined) updateData.opStock = parseFloat(opStock);
    if (opStockDate !== undefined) updateData.opStockDate = opStockDate ? new Date(opStockDate) : null;
    if (annuCon !== undefined || annualConsumption !== undefined) updateData.annuCon = parseFloat(annuCon ?? annualConsumption);
    if (safetyFactor !== undefined) updateData.safetyFactor = parseFloat(safetyFactor);
    if (leadTimeDays !== undefined) updateData.leadTimeDays = parseFloat(leadTimeDays);
    if (optimumQty !== undefined) updateData.optimumQty = parseFloat(optimumQty);
    if (maxQty !== undefined) updateData.maxQty = parseFloat(maxQty);

    const updated = await prisma.inventoryRawMaterial.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Raw Material Item
// @route   DELETE /api/inventory/raw-material/:id
const deleteRawMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.inventoryRawMaterial.delete({ where: { id: parseInt(id, 10) } });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
};
