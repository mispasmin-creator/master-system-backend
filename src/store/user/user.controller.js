const { prisma } = require('../../config/db');

// @desc    Get all user
// @route   GET /api/store/user
const getAll = async (req, res, next) => {
  try {
    const data = await prisma.storeUser.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/store/user/:id
const getOne = async (req, res, next) => {
  try {
    const data = await prisma.storeUser.findUnique({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ALLOWED_FIELDS = new Set([
  'username',
  'name',
  'firmNameMatch',
  'administrate',
  'createIndent',
  'createPo',
  'indentApprovalView',
  'indentApprovalAction',
  'updateVendorView',
  'updateVendorAction',
  'threePartyApprovalView',
  'threePartyApprovalAction',
  'receiveItemView',
  'receiveItemAction',
  'storeOutApprovalView',
  'storeOutApprovalAction',
  'pendingIndentsView',
  'ordersView',
  'againAuditing',
  'takeEntryByTelly',
  'reauditData',
  'rectifyTheMistake',
  'auditData',
  'sendDebitNote',
  'returnMaterialToParty',
  'exchangeMaterials',
  'insteadOfQualityCheckInReceivedItem',
  'dbForPc',
  'billNotReceived',
  'storeIn',
  'hodStoreApproval',
  'poHistory',
  'storeIssue',
  'issueData',
  'inventory',
  'pendingPo',
  'fullKiting',
  'makePayment',
  'paymentStatus',
  'createdAt',
  'updatedAt'
]);

function sanitizeUserData(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

// @desc    Create user
// @route   POST /api/store/user
const create = async (req, res, next) => {
  try {
    const data = await prisma.storeUser.create({
      data: sanitizeUserData(req.body)
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PATCH /api/store/user/:id
const update = async (req, res, next) => {
  try {
    const data = await prisma.storeUser.update({
      where: { id: parseInt(req.params.id, 10) || req.params.id },
      data: sanitizeUserData(req.body)
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/store/user/:id
const remove = async (req, res, next) => {
  try {
    await prisma.storeUser.delete({
      where: { id: parseInt(req.params.id, 10) || req.params.id }
    });
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove };
