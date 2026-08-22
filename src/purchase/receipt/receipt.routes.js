const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, submitReceipt, updateReceipt, revertReceipt } = require('./receipt.controller');

router.get('/data', listData);
router.post('/submit', protect, submitReceipt);
router.post('/update/:receiptId', protect, requireSuperAdmin, updateReceipt);
router.post('/revert', protect, requireSuperAdmin, revertReceipt);

module.exports = router;
