const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, create, update, remove } = require('./full-kitting.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

router.route('/:id')
  .get(protect, getOne)
  .patch(protect, update)
  .delete(protect, remove);

module.exports = router;
