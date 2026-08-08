const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitReceipt, updateReceipt, revertReceipt } = require('./receipt.controller');

router.get('/data', listData);
router.post('/submit', protect, submitReceipt);
router.post('/update/:receiptId', protect, updateReceipt);
router.post('/revert', protect, revertReceipt);

module.exports = router;
