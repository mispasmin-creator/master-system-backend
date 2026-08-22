const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getAll, getOne, create, update } = require('./logistics.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, requireSuperAdmin, update);

module.exports = router;
