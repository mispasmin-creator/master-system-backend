const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getAll, getOne, create, update, remove } = require('./indent.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, requireSuperAdmin, update)
  .delete(protect, requireSuperAdmin, remove);

module.exports = router;
