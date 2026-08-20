const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// @desc    Get Inventory System Users & Page Access Settings
// @route   GET /api/inventory/settings
const getSettings = async (req, res, next) => {
  try {
    const users = await prisma.login.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        firm_name: true,
        page_access: true,
        last_login: true,
      },
      orderBy: { id: 'asc' },
    });

    const formattedUsers = users.map((u) => {
      let pageAccessArr = [];
      if (u.page_access) {
        pageAccessArr = u.page_access
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        firm_name: u.firm_name,
        page_access: pageAccessArr,
        last_login: u.last_login,
      };
    });

    res.json({
      success: true,
      data: {
        users: formattedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update User Page Access Settings
// @route   PUT /api/inventory/settings
const updateSettings = async (req, res, next) => {
  try {
    const { userId, pageAccess } = req.body;
    if (!userId) {
      res.status(400);
      throw new Error('userId is required');
    }

    let pageAccessStr = null;
    if (Array.isArray(pageAccess)) {
      pageAccessStr = pageAccess.join(',');
    } else if (typeof pageAccess === 'string') {
      pageAccessStr = pageAccess;
    }

    const updatedUser = await prisma.login.update({
      where: { id: parseInt(userId, 10) },
      data: {
        page_access: pageAccessStr,
      },
      select: {
        id: true,
        username: true,
        role: true,
        firm_name: true,
        page_access: true,
      },
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Inventory Master Table data (raw materials, trading materials, finished goods)
// @route   GET /api/inventory/master
const listMasterRows = async (req, res, next) => {
  try {
    const [rawMaterials, finishedGoods, tradingMaterials] = await Promise.all([
      prisma.inventoryRawMaterial.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.inventoryFinishGoods.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.inventoryTradingMaterial.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const formattedRaw = rawMaterials.map((r) => ({
      id: r.id,
      itemName: r.itemName,
      rawMaterialName: r.itemName,
      firmName: r.firmName,
      unit: r.unit || 'MT',
      opStock: r.opStock,
      category: 'Raw Material',
    }));

    const formattedTrading = tradingMaterials.map((r) => ({
      id: r.id,
      itemName: r.productName,
      rawMaterialName: r.productName,
      firmName: r.firmName,
      opStock: r.opStock,
      category: 'Trading Material',
    }));

    const items = [...formattedRaw, ...formattedTrading];

    res.json({
      success: true,
      data: {
        items,
        rawMaterials,
        finishedGoods,
        tradingMaterials,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Add entry in Inventory Master
// @route   POST /api/inventory/master
const createMasterEntry = async (req, res, next) => {
  try {
    const { itemName, rawMaterialName, productName, firmName, unit, opStock, vendorName } = req.body;
    const name = (itemName || rawMaterialName || productName || vendorName || '').trim();
    if (!name) {
      res.status(400);
      throw new Error('Item or Material Name is required.');
    }

    const firm = (firmName || 'PMMPL').trim();

    const existing = await prisma.inventoryRawMaterial.findFirst({
      where: { firmName: firm, itemName: name },
    });

    const entry =
      existing ||
      (await prisma.inventoryRawMaterial.create({
        data: {
          firmName: firm,
          itemName: name,
          unit: unit || 'MT',
          opStock: opStock ? parseFloat(opStock) : 0,
        },
      }));

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  listMasterRows,
  createMasterEntry,
};
