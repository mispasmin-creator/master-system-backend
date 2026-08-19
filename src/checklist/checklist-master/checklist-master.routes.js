const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('./checklist-master.controller');
const { protect } = require('../../middleware/auth');

router.route('/')
  .get(getAll)
  .post(protect, create);

router.route('/:id')
  .get(getOne)
  .patch(protect, update)
  .delete(protect, remove);

module.exports = router;
