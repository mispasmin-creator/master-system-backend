const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('./checklist-master.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

router.route('/')
  .get(getAll)
  .post(protect, create);

router.route('/:id')
  .get(getOne)
  .patch(protect, requireSuperAdmin, update)
  .delete(protect, requireSuperAdmin, remove);

module.exports = router;
