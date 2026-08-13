const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, create } = require('./crushing-items.controller');

router.route('/')
  .get(protect, getAll)
  .post(protect, create);

module.exports = router;
