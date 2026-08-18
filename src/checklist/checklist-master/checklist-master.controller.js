const { prisma } = require('../../config/db');

// @desc    Get all checklist master records
// @route   GET /api/checklist/master or /api/checklist-master
const getAll = async (req, res, next) => {
  try {
    let data;
    if (prisma.checklistMaster && typeof prisma.checklistMaster.findMany === 'function') {
      data = await prisma.checklistMaster.findMany({
        orderBy: { id: 'asc' }
      });
    } else {
      data = await prisma.$queryRawUnsafe(`SELECT * FROM "checklist_master" ORDER BY id ASC`);
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single checklist master record by ID
// @route   GET /api/checklist/master/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.checklistMaster.findUnique({
      where: { id: parseInt(req.params.id, 10) }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne };
