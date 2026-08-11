const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getSettings, updateSettings } = require('./master.controller');

router.route('/')
  .get(protect, getSettings)
  .put(protect, updateSettings);

module.exports = router;
