const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitLab, updateLab, revertLab } = require('./lab.controller');

router.get('/data', listData);
router.post('/submit', protect, submitLab);
router.post('/update/:labId', protect, updateLab);
router.post('/revert', protect, revertLab);

module.exports = router;
