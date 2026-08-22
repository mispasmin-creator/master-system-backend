const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceMakePayment } = require('./makePayment.controller');
const { protect } = require('../../middleware/auth');

router.post('/make-payment', protect, advanceMakePayment);

module.exports = router;
