const express = require('express');
const router = express.Router();
const controller = require('./makePayment.controller');

router.post('/:id/pay', controller.handleFinalPayment);

module.exports = router;
