const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, submitLab, updateLab, revertLab } = require('./lab.controller');

router.get('/data', listData);
router.post('/submit', protect, submitLab);
router.post('/update/:labId', protect, requireSuperAdmin, updateLab);
router.post('/revert', protect, requireSuperAdmin, revertLab);

module.exports = router;
