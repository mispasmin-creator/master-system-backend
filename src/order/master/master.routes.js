const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listMasterRows, getAllOptions, createMasterEntry } = require('./master.controller');

router.get('/all-options', getAllOptions);
router.get('/', listMasterRows);
router.post('/', protect, createMasterEntry);

module.exports = router;
