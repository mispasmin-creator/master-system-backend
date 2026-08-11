const { prisma } = require('../../config/db');

// @desc    Get all checklist licenses
// @route   GET /api/checklist/license
// @access  Private
const getAllLicenses = async (req, res, next) => {
  try {
    const data = await prisma.checklistLicense.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a checklist license
// @route   POST /api/checklist/license
// @access  Private
const createLicense = async (req, res, next) => {
  try {
    const data = await prisma.checklistLicense.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a checklist license
// @route   PUT /api/checklist/license/:id
// @access  Private
const updateLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.checklistLicense.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLicenses,
  createLicense,
  updateLicense
};
