const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} = require('./rawMaterial.controller');

router.route('/')
  .get(protect, getRawMaterial)
  .post(protect, createRawMaterial);

router.route('/:id')
  .put(protect, updateRawMaterial)
  .delete(protect, deleteRawMaterial);

module.exports = router;
