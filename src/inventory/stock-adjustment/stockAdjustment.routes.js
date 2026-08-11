const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getStockAdjustments, createStockAdjustment } = require('./stockAdjustment.controller');

router.route('/')
  .get(protect, getStockAdjustments)
  .post(protect, createStockAdjustment);

module.exports = router;
