const express = require('express');
const router = express.Router();
const controller = require('./vendor.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, controller.getAllVendors);
router.post('/', protect, controller.createVendor);
router.put('/:id', protect, controller.updateVendor);
router.delete('/:id', protect, controller.deleteVendor);

module.exports = router;
