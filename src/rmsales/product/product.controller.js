const { prisma } = require('../../config/db');

// @desc    Get all products
// @route   GET /api/rmsales/product
const getAll = async (req, res, next) => {
  try {
    const dbProducts = await prisma.rmSalesProduct.findMany({
      orderBy: { createdAt: 'desc' },
      include: { inventory: true }
    });

    const masterRows = await prisma.rmSalesMaster.findMany({
      where: { productName: { not: null } }
    });

    const prodMap = new Map();
    dbProducts.forEach(p => {
      prodMap.set(p.name.toLowerCase(), {
        id: p.id,
        name: p.name,
        unit: p.unit || 'MT',
        available_qty: p.availableQty || (p.inventory ? p.inventory.availableQty : 0),
        created_at: p.createdAt,
        updated_at: p.updatedAt
      });
    });

    masterRows.forEach(m => {
      if (m.productName && m.productName.trim()) {
        const nameTrimmed = m.productName.trim();
        const key = nameTrimmed.toLowerCase();
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            id: m.id,
            name: nameTrimmed,
            unit: 'MT',
            available_qty: 0,
            created_at: m.createdAt,
            updated_at: m.updatedAt
          });
        }
      }
    });

    const data = Array.from(prodMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/rmsales/product/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.rmSalesProduct.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product and sync inventory
// @route   POST /api/rmsales/product
const create = async (req, res, next) => {
  try {
    const data = await prisma.$transaction(async (tx) => {
      const product = await tx.rmSalesProduct.create({
        data: req.body,
      });

      const availableQty = product.availableQty ?? 0;

      await tx.rmSalesInventory.upsert({
        where: { productId: product.id },
        update: {
          availableQty: availableQty,
          updatedAt: new Date(),
        },
        create: {
          productId: product.id,
          availableQty: availableQty,
          soldQty: 0,
          updatedAt: new Date(),
        },
      });

      return product;
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product and sync inventory
// @route   PATCH /api/rmsales/product/:id
const update = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10) || req.params.id;
    const data = await prisma.$transaction(async (tx) => {
      const product = await tx.rmSalesProduct.update({
        where: { id: productId },
        data: req.body,
      });

      if (product.availableQty !== undefined && product.availableQty !== null) {
        await tx.rmSalesInventory.upsert({
          where: { productId: product.id },
          update: {
            availableQty: product.availableQty,
            updatedAt: new Date(),
          },
          create: {
            productId: product.id,
            availableQty: product.availableQty,
            soldQty: 0,
            updatedAt: new Date(),
          },
        });
      }

      return product;
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/rmsales/product/:id
const remove = async (req, res, next) => {
  try {
    await prisma.rmSalesProduct.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
