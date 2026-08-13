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

// @desc    Create actual-production
// @route   POST /api/production/actual-production
const create = async (req, res, next) => {
  try {
    const data = await prisma.productionActualRun.create({
      data: req.body,
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
    const data = await prisma.productionActualRun.update({
      where: { id: req.params.id },
      data: req.body
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
