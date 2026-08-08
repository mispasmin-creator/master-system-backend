const { prisma } = require('../../config/db');

// @desc    List all firms
// @route   GET /api/purchase/firms
// @access  Public
const listFirms = async (req, res, next) => {
  try {
    const firms = await prisma.purchaseFirm.findMany({ orderBy: { firmName: 'asc' } });
    res.json({ success: true, data: firms });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a firm
// @route   POST /api/purchase/firms
// @access  Private
const createFirm = async (req, res, next) => {
  try {
    const {
      firmName, dataName, address, billingAddress,
      gstin, pan, phone, email, poPrefix,
    } = req.body;

    if (!firmName || !String(firmName).trim()) {
      res.status(400);
      throw new Error('Firm name is required');
    }

    const firm = await prisma.purchaseFirm.create({
      data: {
        firmName: firmName.trim() || null,
        dataName: dataName?.trim() || null,
        address: address?.trim() || null,
        billingAddress: billingAddress?.trim() || null,
        gstin: gstin?.trim() || null,
        pan: pan?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        poPrefix: poPrefix?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: firm });
  } catch (error) {
    next(error);
  }
};

module.exports = { listFirms, createFirm };
