const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, updateMismatch, revertMismatch } = require('./mismatch.controller');

router.get('/data', listData);
router.post('/update/:mismatchId', protect, updateMismatch);
router.post('/revert', protect, revertMismatch);

module.exports = router;
