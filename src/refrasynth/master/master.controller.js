const { prisma } = require('../../config/db');

// @desc    Get all master
// @route   GET /api/refrasynth/master
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthMaster.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single master by ID
// @route   GET /api/refrasynth/master/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthMaster.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'category',
  'groupName',
  'itemName',
  'department',
  'areaOfUse',
  'uom',
  'firmName',
  'fmsName',
  'paymentTerm',
  'defaultTerms',
  'where',
  'vendorName',
  'vendorGstin',
  'vendorAddress',
  'vendorEmail',
  'companyName',
  'companyAddress',
  'companyGstin',
  'companyPhone',
  'companyPan',
  'billingAddress',
  'destinationAddress',
  'createdAt',
  'updatedAt'
]);

function sanitizeMasterData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

// @desc    Create master
// @route   POST /api/refrasynth/master
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthMaster.create({
      data: sanitizeMasterData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update master
// @route   PATCH /api/refrasynth/master/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthMaster.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeMasterData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete master
// @route   DELETE /api/refrasynth/master/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthMaster.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
