const { prisma } = require('../../config/db');

const uniqueSorted = (values) =>
  Array.from(
    new Set(
      values
        .filter((v) => v && String(v).trim() !== '')
        .map((v) => String(v).trim())
    )
  ).sort();

// @desc    All Master rows (Settings > Master Table Entry vendors/transporters lists)
// @route   GET /api/purchase/master
// @access  Public
const listMasterRows = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseMaster.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    All tolerance-limit rows (Settings > Master Table Entry raw materials list)
// @route   GET /api/purchase/master/tolerance
// @access  Public
const listToleranceRows = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseToleranceLimit.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Distinct firm names from purchase_master's "Firm Name" column
// @route   GET /api/purchase/master/firms
// @access  Public
const getMasterFirmNames = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseMaster.findMany({
      where: { firmName: { not: null } },
      select: { firmName: true },
      distinct: ['firmName'],
    });

    res.json({ success: true, data: uniqueSorted(rows.map((r) => r.firmName)) });
  } catch (error) {
    next(error);
  }
};

// @desc    All dropdown option lists + firm->generatedBy mapping IndentForm needs
// @route   GET /api/purchase/master/indent-options
// @access  Public
const getIndentOptions = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseMaster.findMany({ orderBy: { id: 'asc' } });

    const firmNameMapping = {};
    rows.forEach((row) => {
      const firm = row.firmName?.trim();
      const genBy = row.generatedBy?.trim();
      if (firm && genBy) {
        firmNameMapping[firm] = genBy;
      }
    });

    res.json({
      success: true,
      data: {
        generatedByOptions: uniqueSorted(rows.map((r) => r.generatedBy)),
        vendorOptions: uniqueSorted(rows.map((r) => r.vendorName)),
        materialOptions: uniqueSorted(rows.map((r) => r.rawMaterialName)),
        indentTypeOptions: uniqueSorted(rows.map((r) => r.typeOfIndent)),
        uomOptions: uniqueSorted(rows.map((r) => r.uom)),
        firmNameOptions: uniqueSorted(rows.map((r) => r.firmName)),
        firmNameMapping,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Full master-data option set (reference: masterDataUtils.fetchMasterData
//          over the wide "Master" table) — every dropdown list + maps the
//          downstream pages (Arrange Logistics, Lift, Receipt, Lab, KYC, ...)
//          consume, in the exact same shape so the frontend util is a drop-in.
// @route   GET /api/purchase/master/all-options
// @access  Public
const getAllOptions = async (req, res, next) => {
  try {
    const rows = await prisma.purchaseMaster.findMany({ orderBy: { id: 'asc' } });

    const uniq = (getter) => uniqueSorted(rows.map(getter));

    const transporterMasterRecords = rows
      .filter((r) => String(r.typeOfKycForm || '').trim().toLowerCase() === 'transportation')
      .map((r) => ({
        name: String(r.transporterName2 || r.transporterName || '').trim(),
        // The normalized purchase_master has no dedicated transport rate/rate-type
        // columns (they lived on the reference wide "Master" table); default blank.
        rateType: String(r.rateType || '').trim(),
        rate: '',
      }))
      .filter((r) => r.name);

    const transporterMasterMap = transporterMasterRecords.reduce((acc, r) => {
      acc[r.name] = r;
      return acc;
    }, {});

    const transporterNames = uniqueSorted([
      ...rows.map((r) => r.transporterName),
      ...rows.map((r) => r.transporterName2),
      ...transporterMasterRecords.map((r) => r.name),
    ]);

    const transporterMasterOptions = transporterNames.map((name) => ({
      name,
      rateType: transporterMasterMap[name]?.rateType || '',
      rate: transporterMasterMap[name]?.rate || '',
    }));

    const firmNameMapping = {};
    rows.forEach((r) => {
      const firm = r.firmName?.trim();
      const genBy = r.generatedBy?.trim();
      if (firm && genBy) firmNameMapping[firm] = genBy;
    });

    const rateTypeCombined = uniqueSorted([
      ...rows.map((r) => r.rateType),
      ...rows.map((r) => r.typeOfRate),
    ]);

    res.json({
      success: true,
      data: {
        firmNameMapping,
        generatedByOptions: uniq((r) => r.generatedBy),
        vendorOptions: uniq((r) => r.vendorName),
        materialOptions: uniq((r) => r.rawMaterialName),
        indentTypeOptions: uniq((r) => r.typeOfIndent),
        rateTypeOptions: rateTypeCombined.length > 0 ? rateTypeCombined : ['Per MT', 'Fixed'],
        areaLiftingOptions: uniq((r) => r.areaLifting),
        typeOptions: uniq((r) => r.type),
        transporterOptions: transporterNames,
        transporterMasterOptions,
        transporterMasterMap,
        firmNameOptions: uniq((r) => r.firmName),
        kycFormTypeOptions: uniq((r) => r.typeOfKycForm),
        vendorKycOptions: uniq((r) => r.vendorNameKyc),
        productNameOptions: uniq((r) => r.productName),
        transporter2Options: uniq((r) => r.transporterName2),
        gstNumbers: uniq((r) => r.gstNumber),
        bankAccountNumbers: uniq((r) => r.bankAccountNo),
        ifscCodes: uniq((r) => r.ifscCode),
        phoneNumbers: uniq((r) => r.phoneNumber),
        emails: uniq((r) => r.email),
        uomOptions: uniq((r) => r.uom),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Master entry (Vendor Name / Transporter / Raw Material)
// @route   POST /api/purchase/master
// @access  Private
const createMasterEntry = async (req, res, next) => {
  try {
    const {
      type, vendorName, transporterName, rawMaterialName,
      aluminaRange, ironRange, apRange, bdRange,
    } = req.body;

    if (!type) {
      res.status(400);
      throw new Error('Please select a valid type.');
    }

    if (type === 'Vendor Name') {
      const entry = await prisma.purchaseMaster.create({
        data: { vendorName: vendorName?.trim() || null },
      });
      return res.status(201).json({ success: true, data: entry });
    }

    if (type === 'Transporter') {
      const entry = await prisma.purchaseMaster.create({
        data: {
          transporterName: transporterName?.trim() || null,
          typeOfKycForm: 'Transportation',
        },
      });
      return res.status(201).json({ success: true, data: entry });
    }

    if (type === 'Raw Material') {
      const name = rawMaterialName?.trim() || null;
      const [tl, master] = await prisma.$transaction([
        prisma.purchaseToleranceLimit.create({
          data: {
            name,
            tlAlumina: aluminaRange ? parseFloat(aluminaRange) : null,
            tlIron: ironRange ? parseFloat(ironRange) : null,
            apPercent: apRange ? parseFloat(apRange) : null,
            bdPercent: bdRange ? parseFloat(bdRange) : null,
          },
        }),
        prisma.purchaseMaster.create({
          data: {
            rawMaterialName: name,
            typeOfKycForm: 'Product',
            productName: name,
          },
        }),
      ]);
      return res.status(201).json({ success: true, data: { tl, master } });
    }

    res.status(400);
    throw new Error('Invalid type.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMasterRows,
  listToleranceRows,
  getMasterFirmNames,
  getIndentOptions,
  getAllOptions,
  createMasterEntry,
};
