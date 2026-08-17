const { prisma } = require('../../config/db');

// @desc    Get all store-in
// @route   GET /api/refrasynth/store-in
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single store-in by ID
// @route   GET /api/refrasynth/store-in/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthStoreIn.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'timestamp',
  'liftNumber',
  'indentNo',
  'poNumber',
  'poDate',
  'poCopy',
  'vendorName',
  'productName',
  'qty',
  'uom',
  'billStatus',
  'billNo',
  'billAmount',
  'discountAmount',
  'typeOfBill',
  'paymentType',
  'advanceAmountIfAny',
  'photoOfBill',
  'leadTimeToLiftMaterial',
  'transportationInclude',
  'transporterName',
  'amount',
  'vehicleNo',
  'driverName',
  'driverMobileNo',
  'planned6',
  'actual6',
  'timeDelay6',
  'receivedQuantity',
  'photoOfProduct',
  'damageOrder',
  'quantityAsPerBill',
  'priceAsPerPo',
  'remark',
  'warrantyStatus',
  'endDateWarrenty',
  'plannedHod',
  'actualHod',
  'hodStatus',
  'hodRemark',
  'planned11',
  'actual11',
  'billStatusNew',
  'billImageStatus',
  'billRemark',
  'planned7',
  'actual7',
  'timeDelay7',
  'status',
  'reason',
  'planned8',
  'actual8',
  'delay8',
  'statusPurchaser',
  'planned9',
  'actual9',
  'timeDelay9',
  'debitNoteCopy',
  'debitnotenumber',
  'billCopy',
  'returnCopy',
  'planned10',
  'actual10',
  'timeDelay10',
  'warrenty',
  'billReceived',
  'billAmount2',
  'billImage',
  'exchangeQty',
  'billNumber2',
  'firmNameMatch',
  'location',
  'materialStatus',
  'indentId',
  'createdAt',
  'updatedAt'
]);

const FLOAT_FIELDS = new Set([
  'qty',
  'billAmount',
  'discountAmount',
  'leadTimeToLiftMaterial',
  'amount',
  'receivedQuantity',
  'quantityAsPerBill',
  'priceAsPerPo'
]);

const INT_FIELDS = new Set([
  'indentId'
]);

const DATETIME_FIELDS = new Set([
  'timestamp',
  'poDate',
  'endDateWarrenty',
  'createdAt',
  'updatedAt'
]);

function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    let hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7] ? match[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const parsed = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function sanitizeStoreInData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      const val = body[key];
      if (FLOAT_FIELDS.has(key)) {
        if (val === null || val === undefined || val === '') {
          sanitized[key] = null;
        } else {
          const num = Number(val);
          sanitized[key] = isNaN(num) ? null : num;
        }
      } else if (INT_FIELDS.has(key)) {
        if (val === null || val === undefined || val === '') {
          sanitized[key] = null;
        } else {
          const num = parseInt(val, 10);
          sanitized[key] = isNaN(num) ? null : num;
        }
      } else if (DATETIME_FIELDS.has(key)) {
        sanitized[key] = parseDateValue(val);
      } else {
        sanitized[key] = val !== undefined && val !== null ? String(val) : null;
      }
    }
  }
  return sanitized;
}

// @desc    Create store-in
// @route   POST /api/refrasynth/store-in
const create = async (req, res, next) => {
  try {
    const sanitized = sanitizeStoreInData(req.body);
    if (!sanitized.liftNumber) {
      const count = await prisma.refrasynthStoreIn.count();
      sanitized.liftNumber = `LIFT-${String(count + 1).padStart(4, '0')}`;
    }
    const data = await prisma.refrasynthStoreIn.create({
      data: sanitized
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update store-in
// @route   PATCH /api/refrasynth/store-in/:id
const update = async (req, res, next) => {
  try {
    const rawParam = req.params.id;
    const numId = parseInt(rawParam, 10);
    const isNumeric = !isNaN(numId) && String(numId) === String(rawParam);
    const sanitizedData = sanitizeStoreInData(req.body);

    if (isNumeric) {
      const data = await prisma.refrasynthStoreIn.update({
        where: { id: numId },
        data: sanitizedData
      });
      return res.json({ success: true, data });
    } else {
      const record = await prisma.refrasynthStoreIn.findFirst({
        where: { liftNumber: String(rawParam) }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: `StoreIn record not found for liftNumber ${rawParam}` });
      }
      const data = await prisma.refrasynthStoreIn.update({
        where: { id: record.id },
        data: sanitizedData
      });
      return res.json({ success: true, data });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete store-in
// @route   DELETE /api/refrasynth/store-in/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthStoreIn.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
