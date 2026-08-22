const express = require('express');
const router = express.Router();
const controller = require('./makePayment.controller');
const { protect } = require('../../middleware/auth');

router.post('/:id/pay', protect, controller.handleFinalPayment);

module.exports = router;
