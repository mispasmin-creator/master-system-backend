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

module.exports = {
  getSettings,
  updateSettings,
};
