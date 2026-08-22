const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getMasterDropdowns, createMasterDropdown, updateMasterDropdown, deleteMasterDropdown } = require('./master.controller');

router.get('/', getMasterDropdowns);
router.post('/', protect, createMasterDropdown);
router.patch('/:id', protect, requireSuperAdmin, updateMasterDropdown);
router.delete('/:id', protect, requireSuperAdmin, deleteMasterDropdown);

module.exports = router;
