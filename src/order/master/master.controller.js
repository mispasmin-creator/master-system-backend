const { prisma } = require('../../config/db');

const uniqueSorted = (values) =>
  Array.from(
    new Set(
      values
        .filter((v) => v && String(v).trim() !== '')
        .map((v) => String(v).trim())
    )
  ).sort();

// @desc    All Master rows (Settings > Master Table Entry)
// @route   GET /api/order/master
// @access  Public
const listMasterRows = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaster.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Full master-data option set — every dropdown list OrderForm /
//          ArrangeLogistics / LogisticPage / MaterialReturnPage / TC page /
//          ManageUsersPage (firm list) consume, in one call.
// @route   GET /api/order/master/all-options
// @access  Public
const getAllOptions = async (req, res, next) => {
  try {
    const rows = await prisma.orderMaster.findMany({ orderBy: { id: 'asc' } });

    const uniq = (getter) => uniqueSorted(rows.map(getter));

    // Party Name -> {address, gstNumber} auto-fill map (Dashboard's "Add
    // Master Data" dialog requires Address+GST when adding a Party Name row).
    const partyDetailsMap = {};
    rows.forEach((r) => {
      const party = r.partyName?.trim();
      if (party && !partyDetailsMap[party]) {
        partyDetailsMap[party] = { address: r.address || '', gstNumber: r.gstNumber || '' };
      }
    });

    res.json({
      success: true,
      data: {
        firmNameOptions: uniq((r) => r.firmName),
        partyNameOptions: uniq((r) => r.partyName),
        customerCategoryOptions: uniq((r) => r.customerCategory),
        typeOfPiOptions: uniq((r) => r.typeOfPi),
        marketingSalesPersonOptions: uniq((r) => r.marketingSalesPerson),
        productNameOptions: uniq((r) => r.productName),
        uomOptions: uniq((r) => r.uom),
        transporterNameOptions: uniq((r) => r.transporterName),
        materialReturnTransporterNameOptions: uniq((r) => r.materialReturnTransporterName),
        partyDetailsMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Master entry (Firm / Party / Product / Transporter / ...)
// @route   POST /api/order/master
// @access  Private
const createMasterEntry = async (req, res, next) => {
  try {
    const {
      firmName, partyName, address, gstNumber, customerCategory, typeOfPi,
      marketingSalesPerson, productName, uom, transporterName, materialReturnTransporterName,
    } = req.body;

    const hasAny = [
      firmName, partyName, productName, transporterName, materialReturnTransporterName,
    ].some((v) => v && String(v).trim() !== '');
    if (!hasAny) {
      res.status(400);
      throw new Error('Please provide at least one field to add.');
    }

    if (partyName && (!address || !gstNumber)) {
      res.status(400);
      throw new Error('Address and GST Number are required when adding a Party Name.');
    }

    const entry = await prisma.orderMaster.create({
      data: {
        firmName: firmName?.trim() || null,
        partyName: partyName?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        customerCategory: customerCategory?.trim() || null,
        typeOfPi: typeOfPi?.trim() || null,
        marketingSalesPerson: marketingSalesPerson?.trim() || null,
        productName: productName?.trim() || null,
        uom: uom?.trim() || null,
        transporterName: transporterName?.trim() || null,
        materialReturnTransporterName: materialReturnTransporterName?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

module.exports = { listMasterRows, getAllOptions, createMasterEntry };
