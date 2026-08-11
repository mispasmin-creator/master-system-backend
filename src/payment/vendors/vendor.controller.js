const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

/**
 * GET /api/payment/vendors
 * List all vendor master records
 */
exports.getAllVendors = async (req, res, next) => {
  try {
    const vendors = await prisma.paymentVendor.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: vendors.length,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/vendors
 * Create new vendor in PaymentVendor
 */
exports.createVendor = async (req, res, next) => {
  try {
    const body = req.body || {};
    const vendorName = body.vendorName || body["Vendor Name"];

    if (!vendorName) {
      return res.status(400).json({ success: false, error: 'Vendor Name is required.' });
    }

    const existing = await prisma.paymentVendor.findUnique({
      where: { vendorName }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: `Vendor '${vendorName}' already exists.` });
    }

    const vendor = await prisma.paymentVendor.create({
      data: {
        vendorName,
        vendorType: body.vendorType || body["Vendor Type"] || '',
        gstNumber: body.gstNumber || body["GST Number"] || '',
        panNumber: body.panNumber || body["PAN Number"] || '',
        mobileNumber: body.mobileNumber || body["Mobile Number"] || '',
        email: body.email || body.Email || '',
        address: body.address || body.Address || '',
        status: body.status || body.Status || 'Active'
      }
    });

    res.status(201).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payment/vendors/:id
 * Update vendor in PaymentVendor
 */
exports.updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.paymentVendor.findFirst({
      where: {
        OR: [
          { id: id },
          { vendorName: id }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }

    const updated = await prisma.paymentVendor.update({
      where: { id: existing.id },
      data: {
        vendorName: body.vendorName || body["Vendor Name"] || existing.vendorName,
        vendorType: body.vendorType !== undefined ? body.vendorType : existing.vendorType,
        gstNumber: body.gstNumber !== undefined ? body.gstNumber : existing.gstNumber,
        panNumber: body.panNumber !== undefined ? body.panNumber : existing.panNumber,
        mobileNumber: body.mobileNumber !== undefined ? body.mobileNumber : existing.mobileNumber,
        email: body.email !== undefined ? body.email : existing.email,
        address: body.address !== undefined ? body.address : existing.address,
        status: body.status || existing.status
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/payment/vendors/:id
 * Delete vendor from PaymentVendor
 */
exports.deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.paymentVendor.findFirst({
      where: {
        OR: [
          { id: id },
          { vendorName: id }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Vendor not found.' });
    }

    await prisma.paymentVendor.delete({
      where: { id: existing.id }
    });

    res.json({
      success: true,
      message: `Vendor '${existing.vendorName}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
