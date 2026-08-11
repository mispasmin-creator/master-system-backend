const { prisma } = require('../../config/db');

// @desc    Get all companies
// @route   GET /api/checklist/company
// @access  Private
const getAllCompanies = async (req, res, next) => {
  try {
    const data = await prisma.checklistCompany.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a company
// @route   POST /api/checklist/company
// @access  Private
const createCompany = async (req, res, next) => {
  try {
    const data = await prisma.checklistCompany.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a company
// @route   PUT /api/checklist/company/:id
// @access  Private
const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.checklistCompany.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllCompanies, createCompany, updateCompany };
