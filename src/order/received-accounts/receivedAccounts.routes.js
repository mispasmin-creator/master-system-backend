const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listPending, listHistory, markReceived, revert } = require('./receivedAccounts.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:receiptId/revert', protect, requireSuperAdmin, revert);
router.post('/', protect, markReceived);

module.exports = router;
