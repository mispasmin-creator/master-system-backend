const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getStockAdjustments,
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
} = require('./stockAdjustment.controller');

router.route('/')
  .get(protect, getStockAdjustments)
  .post(protect, createStockAdjustment);

router.route('/:id')
  .put(protect, updateStockAdjustment)
  .delete(protect, deleteStockAdjustment);

module.exports = router;
