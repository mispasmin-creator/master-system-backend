const express = require('express');
const router = express.Router();
const controller = require('./vendor.controller');

router.get('/', controller.getAllVendors);
router.post('/', controller.createVendor);
router.put('/:id', controller.updateVendor);
router.delete('/:id', controller.deleteVendor);

module.exports = router;
