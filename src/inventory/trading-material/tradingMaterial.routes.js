const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getTradingMaterial,
  createTradingMaterial,
  updateTradingMaterial,
  deleteTradingMaterial,
} = require('./tradingMaterial.controller');

router.route('/')
  .get(protect, getTradingMaterial)
  .post(protect, createTradingMaterial);

router.route('/:id')
  .put(protect, updateTradingMaterial)
  .delete(protect, deleteTradingMaterial);

module.exports = router;
