const { prisma } = require('../../config/db');

// @desc    Get all actual-production
// @route   GET /api/production/actual-production
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.productionActualRun.findMany({
      include: {
        materials: true,
        jobCard: { include: { order: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single actual-production by ID
// @route   GET /api/production/actual-production/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.productionActualRun.findUnique({
      where: { id: req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const sanitizeActualRunPayload = (body) => {
  const payload = { ...body };
  if ('dateOfProduction' in payload) {
    payload.dateOfProduction = parseDate(payload.dateOfProduction);
  }
  if ('quantityFg' in payload && payload.quantityFg !== undefined && payload.quantityFg !== null) {
    payload.quantityFg = payload.quantityFg === '' ? null : Number(payload.quantityFg);
  }
  if ('machineHours' in payload && payload.machineHours !== undefined && payload.machineHours !== null) {
    payload.machineHours = payload.machineHours === '' ? null : Number(payload.machineHours);
  }
  if ('ppBagUsed' in payload && payload.ppBagUsed !== undefined && payload.ppBagUsed !== null) {
    payload.ppBagUsed = payload.ppBagUsed === '' ? null : Number(payload.ppBagUsed);
  }
  if ('ppBagToBeUsed' in payload && payload.ppBagToBeUsed !== undefined && payload.ppBagToBeUsed !== null) {
    payload.ppBagToBeUsed = payload.ppBagToBeUsed === '' ? null : Number(payload.ppBagToBeUsed);
  }
  if ('ppBagSmall' in payload && payload.ppBagSmall !== undefined && payload.ppBagSmall !== null) {
    payload.ppBagSmall = payload.ppBagSmall === '' ? null : Number(payload.ppBagSmall);
  }
  if ('costingAmount' in payload && payload.costingAmount !== undefined && payload.costingAmount !== null) {
    payload.costingAmount = payload.costingAmount === '' ? null : Number(payload.costingAmount);
  }
  if ('jobCardId' in payload && !payload.jobCardId) {
    payload.jobCardId = null;
  }
  return payload;
};

// @desc    Create actual-production
// @route   POST /api/production/actual-production
const create = async (req, res, next) => {
  try {
    const payload = sanitizeActualRunPayload(req.body);
    const data = await prisma.productionActualRun.create({
      data: payload,
      include: {
        materials: true,
        jobCard: { include: { order: true } },
      },
    });

    try {
      const { applyMovement } = require('../../inventory/shared/inventoryMovement.service');
      const order = data.jobCard?.order;
      if (order && order.productName && data.quantityFg) {
        await applyMovement({
          category: 'FinishedGoods',
          firmName: order.firmName,
          itemName: order.productName,
          movementType: 'PRODUCTION',
          quantity: data.quantityFg,
          sourceModule: 'production',
          sourceTable: 'ProductionActualRun',
          sourceId: String(data.id),
        });
      }

      if (data.materials && Array.isArray(data.materials)) {
        for (const mat of data.materials) {
          if (mat.materialName && mat.quantity) {
            await applyMovement({
              category: 'RawMaterial',
              firmName: order?.firmName || '',
              itemName: mat.materialName,
              movementType: 'CONSUMPTION',
              quantity: mat.quantity,
              sourceModule: 'production',
              sourceTable: 'ProductionActualMaterial',
              sourceId: String(mat.id),
            });
          }
        }
      }
    } catch (hookErr) {
      console.error('Inventory movement sync hook error (ProductionActualRun):', hookErr.message);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update actual-production
// @route   PATCH /api/production/actual-production/:id
const update = async (req, res, next) => {
  try {
    const payload = sanitizeActualRunPayload(req.body);
    const data = await prisma.productionActualRun.update({
      where: { id: req.params.id },
      data: payload
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete actual-production
// @route   DELETE /api/production/actual-production/:id
const remove = async (req, res, next) => {
  try {
    await prisma.productionActualRun.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
