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

// @desc    Create checklist master record
// @route   POST /api/checklist/master or /api/checklist-master
const create = async (req, res, next) => {
  try {
    const { firm, firmName, givenBy, doerName, role, vendorName } = req.body;
    const resolvedFirm = firm || firmName;
    const resolvedDoer = doerName || vendorName;

    const data = await prisma.checklistMaster.create({
      data: {
        firm: resolvedFirm?.trim() || null,
        givenBy: givenBy?.trim() || null,
        doerName: resolvedDoer?.trim() || null,
        role: role?.trim() || null,
      }
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update checklist master record
// @route   PATCH /api/checklist/master/:id
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.checklistMaster.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const { firm, firmName, givenBy, doerName, role, vendorName } = req.body;
    const resolvedFirm = firm !== undefined ? firm : firmName;
    const resolvedDoer = doerName !== undefined ? doerName : vendorName;

    const updateData = {};
    if (resolvedFirm !== undefined) updateData.firm = resolvedFirm?.trim() || null;
    if (givenBy !== undefined) updateData.givenBy = givenBy?.trim() || null;
    if (resolvedDoer !== undefined) updateData.doerName = resolvedDoer?.trim() || null;
    if (role !== undefined) updateData.role = role?.trim() || null;

    const data = await prisma.checklistMaster.update({
      where: { id },
      data: updateData,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete checklist master record
// @route   DELETE /api/checklist/master/:id
const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.checklistMaster.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await prisma.checklistMaster.delete({ where: { id } });
    res.json({ success: true, message: 'Checklist master entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
