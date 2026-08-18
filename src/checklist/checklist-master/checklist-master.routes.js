const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('./checklist-master.controller');
const { protect } = require('../../middleware/auth');

router.route('/')
  .get(protect, getAll);

router.route('/:id')
  .get(protect, getOne);

module.exports = router;
