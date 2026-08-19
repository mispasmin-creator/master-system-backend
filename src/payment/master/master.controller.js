const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

const DEFAULT_FIRMS = ["PMMPL", "PMM Logisol", "PMM Retail", "PMM Infra", "PMM Ventures"];
const DEFAULT_TYPE_OF_FUNDING = ["GDFSFY", "BHFDDF", "AFAFAEF", "AEAFAEFA", "EAF"];
const DEFAULT_PAYMENT_MODES = ["NEFT", "RTGS", "IMPS", "UPI", "Cash", "Cheque"];

/**
 * GET /api/payment/master
 * Get master dropdown lists (FMS, Firms, Type of Funding, Payment Modes)
 */
exports.getMasterData = async (req, res, next) => {
  try {
    const fmsList = await prisma.paymentFmsMaster.findMany({
      orderBy: { fmsName: 'asc' }
    });

    const vendors = await prisma.paymentVendor.findMany({
      where: { status: 'Active' },
      select: { vendorName: true }
    });

    res.json({
      success: true,
      data: {
        fms: fmsList.length > 0 ? fmsList : [
          { id: '1', fmsName: 'Repair FMS', firmName: 'PMMPL' },
          { id: '2', fmsName: 'Raw Material FMS', firmName: 'PMM Logisol' },
          { id: '3', fmsName: 'Transporter FMS', firmName: 'PMM Retail' }
        ],
        firms: DEFAULT_FIRMS,
        typeOfFunding: DEFAULT_TYPE_OF_FUNDING,
        paymentModes: DEFAULT_PAYMENT_MODES,
        vendors: vendors.map(v => v.vendorName),
        items: fmsList
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/master
 * Create new Payment master (Vendor or FMS)
 */
exports.createMasterEntry = async (req, res, next) => {
  try {
    const {
      type, vendorName, fmsName, firmName, typeOfFunding, paymentMode,
      vendorType, gstNumber, panNumber, mobileNumber, email, address
    } = req.body;

    if (type === 'Vendor Name' || type === 'Vendor' || (vendorName && !fmsName)) {
      const vName = (vendorName || '').trim();
      if (!vName) {
        return res.status(400).json({ success: false, error: 'Vendor name is required.' });
      }
      const created = await prisma.paymentVendor.create({
        data: {
          vendorName: vName,
          vendorType: vendorType?.trim() || null,
          gstNumber: gstNumber?.trim() || null,
          panNumber: panNumber?.trim() || null,
          mobileNumber: mobileNumber?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          status: 'Active',
        }
      });
      return res.status(201).json({ success: true, data: created });
    }

    const name = (fmsName || vendorName || req.body['FMS Name'] || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'FMS or Master Name is required.' });
    }

    const created = await prisma.paymentFmsMaster.create({
      data: {
        fmsName: name,
        firmName: firmName?.trim() || 'PMMPL',
        typeOfFunding: typeOfFunding?.trim() || '',
        paymentMode: paymentMode?.trim() || 'NEFT',
      }
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/master/fms
 * Create new FMS master record
 */
exports.createFms = async (req, res, next) => {
  try {
    const body = req.body || {};
    const fmsName = body.fmsName || body["FMS Name"];

    if (!fmsName) {
      return res.status(400).json({ success: false, error: 'FMS Name is required.' });
    }

    const created = await prisma.paymentFmsMaster.create({
      data: {
        fmsName,
        firmName: body.firmName || body["Firm Name"] || 'PMMPL',
        typeOfFunding: body.typeOfFunding || body["Type of funding"] || '',
        paymentMode: body.paymentMode || body["Payment Mode"] || 'NEFT'
      }
    });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/payment/master/fms/:id
 * Delete FMS master record
 */
exports.deleteFms = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.paymentFmsMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'FMS item not found.' });
    }

    await prisma.paymentFmsMaster.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `FMS '${existing.fmsName}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment/settings (or /master/users)
 * List users from Login table with firm and page permissions
 */
exports.getUsers = async (req, res, next) => {
  try {
    const logins = await prisma.login.findMany({
      orderBy: { username: 'asc' }
    });

    const mapped = logins.map(u => ({
      username: u.username,
      name: u.name || u.username,
      role: u.role || 'User',
      status: 'Active',
      firms: u.firm_name || 'PMMPL',
      pages: u.page_access ? u.page_access.replace(/Payment_/g, '') : 'Dashboard, Payment Creation',
      email: `${u.username.toLowerCase()}@company.com`
    }));

    res.json({
      success: true,
      count: mapped.length,
      data: mapped
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment/settings (or /master/users)
 * Create user in Login table
 */
exports.createUser = async (req, res, next) => {
  try {
    const body = req.body || {};
    const username = (body.username || body.Username || '').trim();
    const password = body.password || body.Password || 'password123';
    const name = body.name || body.Name || username;
    const role = body.role || body.Role || 'User';
    const firms = body.firms || body.Firms || body["Firm Name"] || 'PMMPL';
    const pages = body.pages || body.Pages || 'Dashboard, Payment Creation';

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }

    const existing = await prisma.login.findUnique({
      where: { username }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: `User '${username}' already exists.` });
    }

    // Prefix payment page names if needed
    const prefixedPages = pages
      .split(',')
      .map(p => p.trim())
      .map(p => p.startsWith('Payment_') ? p : `Payment_${p}`)
      .join(', ');

    const created = await prisma.login.create({
      data: {
        username,
        password,
        name,
        role: role.toLowerCase(),
        firm_name: firms,
        page_access: prefixedPages
      }
    });

    res.status(201).json({
      success: true,
      data: {
        username: created.username,
        name: created.name,
        role: created.role,
        status: 'Active',
        firms: created.firm_name,
        pages: pages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payment/settings/:username
 * Update user in Login table
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { username } = req.params;
    const body = req.body || {};

    const existing = await prisma.login.findUnique({
      where: { username }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const updateData = {};
    if (body.name || body.Name) updateData.name = body.name || body.Name;
    if (body.password || body.Password) updateData.password = body.password || body.Password;
    if (body.role || body.Role) updateData.role = (body.role || body.Role).toLowerCase();
    if (body.firms || body.Firms || body["Firm Name"]) updateData.firm_name = body.firms || body.Firms || body["Firm Name"];
    
    if (body.pages || body.Pages) {
      const pages = body.pages || body.Pages;
      updateData.page_access = pages
        .split(',')
        .map(p => p.trim())
        .map(p => p.startsWith('Payment_') ? p : `Payment_${p}`)
        .join(', ');
    }

    const updated = await prisma.login.update({
      where: { username },
      data: updateData
    });

    res.json({
      success: true,
      data: {
        username: updated.username,
        name: updated.name,
        role: updated.role,
        status: 'Active',
        firms: updated.firm_name,
        pages: body.pages || body.Pages || existing.page_access?.replace(/Payment_/g, '')
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/payment/settings/:username
 * Delete user from Login table
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { username } = req.params;

    const existing = await prisma.login.findUnique({
      where: { username }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    await prisma.login.delete({
      where: { username }
    });

    res.json({
      success: true,
      message: `User '${username}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
