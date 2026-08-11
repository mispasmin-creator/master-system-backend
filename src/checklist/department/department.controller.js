const { prisma } = require('../../config/db');

// @desc    Get all departments
// @route   GET /api/checklist/department
// @access  Private
const getAllDepartments = async (req, res, next) => {
  try {
    const data = await prisma.checklistDepartment.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a department
// @route   POST /api/checklist/department
// @access  Private
const createDepartment = async (req, res, next) => {
  try {
    const data = await prisma.checklistDepartment.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a department
// @route   PUT /api/checklist/department/:id
// @access  Private
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.checklistDepartment.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllDepartments, createDepartment, updateDepartment };
