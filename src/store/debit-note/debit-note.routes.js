const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, upsertByParent, update, remove } = require('./debit-note.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.put('/by-parent/:parentId', protect, upsertByParent);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, update)
  .delete(protect, remove);

module.exports = router;
