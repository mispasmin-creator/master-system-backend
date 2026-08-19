const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, update, remove } = require('./master.controller');

router.route('/')
  .get(getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, update)
  .delete(protect, remove);

module.exports = router;
