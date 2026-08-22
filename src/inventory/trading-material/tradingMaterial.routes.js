const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
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
  .put(protect, requireSuperAdmin, updateTradingMaterial)
  .delete(protect, requireSuperAdmin, deleteTradingMaterial);

module.exports = router;
