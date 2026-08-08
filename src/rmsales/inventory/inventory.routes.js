const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll } = require('./inventory.controller');

router.route('/')
  .get(protect, getAll);

module.exports = router;
