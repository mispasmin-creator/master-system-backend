const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const {
  getMasterDropdowns,
  addMasterDropdown,
  updateMasterDropdown,
  deleteMasterDropdown
} = require('./master.controller');

router.get('/', getMasterDropdowns);
router.post('/', protect, addMasterDropdown);
router.put('/:id', protect, requireSuperAdmin, updateMasterDropdown);
router.delete('/:id', protect, requireSuperAdmin, deleteMasterDropdown);

module.exports = router;
