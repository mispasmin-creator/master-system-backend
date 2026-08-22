const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { listData, submitUnloadApproval, revertUnloadApproval } = require('./unloadApproval.controller');

router.get('/data', listData);
router.post('/submit', protect, submitUnloadApproval);
router.post('/revert', protect, requireSuperAdmin, revertUnloadApproval);

module.exports = router;
