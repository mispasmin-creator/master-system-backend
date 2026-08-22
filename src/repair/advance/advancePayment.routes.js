const express = require('express');
const router = express.Router();
const { getAdvancePayments, createAdvancePayment } = require('./advancePayment.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAdvancePayments);
router.post('/', protect, createAdvancePayment);

module.exports = router;
