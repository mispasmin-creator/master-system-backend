const express = require('express');
const router = express.Router();
const { getAdvancePayments, createAdvancePayment } = require('./advancePayment.controller');

router.get('/', getAdvancePayments);
router.post('/', createAdvancePayment);

module.exports = router;
