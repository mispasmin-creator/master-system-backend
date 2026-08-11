const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const {
  normalizeFirmName,
  getRawMaterialReceipts,
  getRawMaterialRates,
  getProductionConsumption,
} = require('../shared/inventorySync.service');
const {
  dailyConsumption,
  optimumStock,
  maxStock,
  optimumStockTotal,
  stockTotal,
  colour,
} = require('../shared/inventoryFormulas');

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

    const [items, totalCount, liveReceipts, liveRates, liveConsumptions] = await Promise.all([
      prisma.inventoryRawMaterial.findMany({
        where: whereClause,
        orderBy: [{ firmName: 'asc' }, { sNo: 'asc' }],
        skip,
        take: limitNum,
      }),
      prisma.inventoryRawMaterial.count({ where: whereClause }),
      getRawMaterialReceipts(normFirm || ''),
      getRawMaterialRates(normFirm || ''),
      getProductionConsumption(normFirm || ''),
    ]);

    const formattedData = items.map((item) => {
      const normItemKey = item.itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const purchaseQty = liveReceipts[normItemKey]?.quantity || 0;
      const consumptionQty = liveConsumptions[normItemKey]?.quantity || 0;
      const liveRate = liveRates[normItemKey] || item.productRate || 0;

      const dailyCon = dailyConsumption(item.annualConsumption);
      const optStock = optimumStock(item.annualConsumption, item.leadTimeDays, item.safetyFactor);
      const maxStk = maxStock(item.annualConsumption, item.leadTimeDays, item.safetyFactor);
      const optStockTotal = optimumStockTotal(item.annualConsumption, item.leadTimeDays, item.safetyFactor, liveRate);
      const stkTotal = stockTotal(item.actualLevel, liveRate);
      const colFlag = colour(item.actualLevel, item.annualConsumption, item.leadTimeDays, item.safetyFactor);

      return {
        id: item.id,
        s_no: item.sNo,
        firm_name: item.firmName,
        item_name: item.itemName,
        unit: item.unit || '',
        op_stock: item.opStock,
        op_stock_date: item.opStockDate,
        actual_level: item.actualLevel,
        product_rate: liveRate,
        annual_consumption: item.annualConsumption,
        safety_factor: item.safetyFactor,
        lead_time_days: item.leadTimeDays,
        daily_consumption: dailyCon,
        optimum_stock: optStock,
        max_stock: maxStk,
        optimum_stock_total: optStockTotal,
        stock_total: stkTotal,
        colour: colFlag,
        purchase_system: purchaseQty,
        production_consumption: consumptionQty,
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
      productRate,
      annualConsumption,
      safetyFactor,
      leadTimeDays,
      sNo,
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
        unit: unit || '',
        opStock: parseFloat(opStock) || 0,
        opStockDate: opStockDate ? new Date(opStockDate) : null,
        actualLevel: parseFloat(opStock) || 0,
        productRate: parseFloat(productRate) || 0,
        annualConsumption: parseFloat(annualConsumption) || 0,
        safetyFactor: parseFloat(safetyFactor) || 1,
        leadTimeDays: parseFloat(leadTimeDays) || 0,
        sNo: sNo ? parseInt(sNo, 10) : null,
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
      actualLevel,
      productRate,
      annualConsumption,
      safetyFactor,
      leadTimeDays,
      sNo,
    } = req.body;

    const existing = await prisma.inventoryRawMaterial.findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Raw material item not found');
    }

    const updateData = {};
    if (unit !== undefined) updateData.unit = unit;
    if (opStock !== undefined) updateData.opStock = parseFloat(opStock);
    if (opStockDate !== undefined) updateData.opStockDate = opStockDate ? new Date(opStockDate) : null;
    if (actualLevel !== undefined) updateData.actualLevel = parseFloat(actualLevel);
    if (productRate !== undefined) updateData.productRate = parseFloat(productRate);
    if (annualConsumption !== undefined) updateData.annualConsumption = parseFloat(annualConsumption);
    if (safetyFactor !== undefined) updateData.safetyFactor = parseFloat(safetyFactor);
    if (leadTimeDays !== undefined) updateData.leadTimeDays = parseFloat(leadTimeDays);
    if (sNo !== undefined) updateData.sNo = parseInt(sNo, 10);

    const updated = await prisma.inventoryRawMaterial.update({
      where: { id },
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
    await prisma.inventoryRawMaterial.delete({ where: { id } });
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
