const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, markReceived, revert } = require('./receivedAccounts.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:receiptId/revert', protect, revert);
router.post('/', protect, markReceived);

module.exports = router;
