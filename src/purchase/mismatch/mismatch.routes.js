const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, updateMismatch, revertMismatch } = require('./mismatch.controller');

router.get('/data', listData);
router.post('/update/:mismatchId', protect, requireSuperAdmin, updateMismatch);
router.post('/revert', protect, requireSuperAdmin, revertMismatch);

module.exports = router;
