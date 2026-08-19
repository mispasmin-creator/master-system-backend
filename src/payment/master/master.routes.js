const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const controller = require('./master.controller');

// Master Dropdowns
router.get('/', controller.getMasterData);
router.post('/', protect, controller.createMasterEntry);
router.post('/fms', protect, controller.createFms);
router.delete('/fms/:id', protect, controller.deleteFms);

module.exports = router;
