const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getAll, getOne, create, upsertByParent, update, remove } = require('./rectify.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.put('/by-parent/:parentId', protect, upsertByParent);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, requireSuperAdmin, update)
  .delete(protect, requireSuperAdmin, remove);

module.exports = router;
