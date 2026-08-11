const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
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
  .put(protect, updateFinishedGood)
  .delete(protect, deleteFinishedGood);

module.exports = router;
