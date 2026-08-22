const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const controller = require('./master.controller');

// Master Dropdowns
router.get('/', controller.getMasterData);
router.post('/', protect, controller.createMasterEntry);
router.post('/fms', protect, controller.createFms);
router.delete('/fms/:id', protect, requireSuperAdmin, controller.deleteFms);

module.exports = router;
