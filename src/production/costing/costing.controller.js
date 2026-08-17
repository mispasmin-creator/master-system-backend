const { prisma } = require('../../config/db');

// @desc    Get all costing
// @route   GET /api/production/costing
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.findMany({
      include: {
        order: true,
        materials: true,
        piApproval: true,
        sampleTest: true,
        managementReview: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single costing by ID
// @route   GET /api/production/costing/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionCosting.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const sanitizeCostingPayload = (body) => {
  const { materials, ...costingData } = body;
  const payload = { ...costingData };

  const numFields = [
    'alumina', 'iron', 'bd', 'ap', 'variableCost', 'fixedCost',
    'manufacturingCost', 'transportingFor', 'sellingPrice', 'gpPercent',
    'aluminaPercent', 'ironPercent', 'bdPercent', 'apPercent'
  ];
  numFields.forEach((f) => {
    if (f in payload && payload[f] !== undefined && payload[f] !== null && payload[f] !== '') {
      payload[f] = Number(payload[f]);
    } else if (payload[f] === '') {
      payload[f] = null;
    }
  });

  if ('orderId' in payload && !payload.orderId) {
    payload.orderId = null;
  }

  let materialsCreate = undefined;
  if (materials) {
    if (materials.create && Array.isArray(materials.create)) {
      materialsCreate = materials;
    } else if (Array.isArray(materials) && materials.length > 0) {
      materialsCreate = {
        create: materials.map((m, i) => ({
          materialName: m.materialName || m.productName || '',
          quantity: Number(m.quantity || m.percentage) || 0,
          sequence: m.sequence ?? i + 1,
        })),
      };
    }
  }

  return { payload, materialsCreate };
};

// @desc    Create costing
// @route   POST /api/production/costing
const create = async (req, res, next) => {
  try {
    const { payload, materialsCreate } = sanitizeCostingPayload(req.body);
    const data = await prisma.productionCosting.create({
      data: {
        ...payload,
        materials: materialsCreate,
      },
      include: {
        order: true,
        materials: true,
        piApproval: true,
        sampleTest: true,
        managementReview: true,
      },
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update costing
// @route   PATCH /api/production/costing/:id
const update = async (req, res, next) => {
  try {
    const { payload } = sanitizeCostingPayload(req.body);
    const data = await prisma.productionCosting.update({
      where: { id: req.params.id },
      data: payload,
      include: {
        order: true,
        materials: true,
        piApproval: true,
        sampleTest: true,
        managementReview: true,
      },
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete costing
// @route   DELETE /api/production/costing/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionCosting.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
