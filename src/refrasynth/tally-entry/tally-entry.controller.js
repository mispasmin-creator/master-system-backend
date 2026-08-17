const { prisma } = require('../../config/db');

// @desc    Get all tally-entry
// @route   GET /api/refrasynth/tally-entry
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tally-entry by ID
// @route   GET /api/refrasynth/tally-entry/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.findUnique({
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
  'indentNo',
  'purchaseDate',
  'indentDate',
  'indentNumber',
  'liftNumber',
  'poNumber',
  'materialInDate',
  'productName',
  'billNo',
  'qty',
  'partyName',
  'billAmt',
  'billImage',
  'billReceivedLater',
  'notReceivedBillNo',
  'location',
  'typeOfBills',
  'productImage',
  'area',
  'indentedFor',
  'approvedPartyName',
  'rate',
  'indentQty',
  'totalRate',
  'firmName',
  'firmNameMatch',
  'hodStatus',
  'hodRemark',
  'damageOrder',
  'quantityAsPerBill',
  'priceAsPerPoCheck',
  'receivingStatus',
  'receivedQuantity',
  'planned1',
  'actual1',
  'delay1',
  'status1',
  'remarks1',
  'planned2',
  'actual2',
  'delay2',
  'status2',
  'remarks2',
  'planned3',
  'actual3',
  'delay3',
  'status3',
  'remarks3',
  'planned4',
  'actual4',
  'delay4',
  'status4',
  'remarks4',
  'planned5',
  'actual5',
  'status5',
  'remarks5',
  'indentId',
  'storeInId',
  'createdAt',
  'updatedAt'
]);

function sanitizeTallyEntryData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

// @desc    Create tally-entry
// @route   POST /api/refrasynth/tally-entry
const create = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.create({
      data: sanitizeTallyEntryData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tally-entry
// @route   PATCH /api/refrasynth/tally-entry/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.refrasynthTallyEntry.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeTallyEntryData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tally-entry
// @route   DELETE /api/refrasynth/tally-entry/:id
const remove = async (req, res, next) => {
  try {
    await prisma.refrasynthTallyEntry.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
