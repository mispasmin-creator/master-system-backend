const { prisma } = require('../../config/db');

// @desc    Get all inventory
// @route   GET /api/store/inventory
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeInventory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory by ID
// @route   GET /api/store/inventory/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeInventory.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'itemName',
  'groupHead',
  'uom',
  'maxLevel',
  'opening',
  'individualRate',
  'indented',
  'approved',
  'purchaseQuantity',
  'outQuantity',
  'current',
  'minStock',
  'maxStock',
  'totalPrice',
  'colorCode',
  'status',
  'firmName',
  'createdAt',
  'updatedAt'
]);

function sanitizeInventoryData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

// @desc    Create inventory
// @route   POST /api/store/inventory
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeInventory.create({
      data: sanitizeInventoryData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory
// @route   PATCH /api/store/inventory/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeInventory.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeInventoryData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory
// @route   DELETE /api/store/inventory/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeInventory.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
