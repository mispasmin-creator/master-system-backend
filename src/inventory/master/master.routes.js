const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getSettings, updateSettings, listMasterRows, createMasterEntry } = require('./master.controller');

router.route('/settings')
  .get(protect, getSettings)
  .put(protect, updateSettings);

router.route('/')
  .get(listMasterRows)
  .post(protect, createMasterEntry);

module.exports = router;
