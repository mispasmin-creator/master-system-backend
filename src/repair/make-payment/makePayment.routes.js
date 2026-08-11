const express = require('express');
const router = express.Router({ mergeParams: true });
const { advanceMakePayment } = require('./makePayment.controller');

router.post('/make-payment', advanceMakePayment);

module.exports = router;
