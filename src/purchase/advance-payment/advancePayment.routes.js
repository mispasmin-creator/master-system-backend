const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, markPaid } = require('./advancePayment.controller');

router.get('/data', listData);
router.post('/mark-paid', protect, markPaid);

module.exports = router;
