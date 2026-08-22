const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const {
  getFinishedGoods,
  createFinishedGood,
  updateFinishedGood,
  deleteFinishedGood,
} = require('./finishedGoods.controller');

router.route('/')
  .get(protect, getFinishedGoods)
  .post(protect, createFinishedGood);

router.route('/:id')
  .put(protect, requireSuperAdmin, updateFinishedGood)
  .delete(protect, requireSuperAdmin, deleteFinishedGood);

module.exports = router;
