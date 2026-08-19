const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getMasterDropdowns,
  addMasterDropdown,
  updateMasterDropdown,
  deleteMasterDropdown
} = require('./master.controller');

router.get('/', getMasterDropdowns);
router.post('/', protect, addMasterDropdown);
router.put('/:id', protect, updateMasterDropdown);
router.delete('/:id', protect, deleteMasterDropdown);

module.exports = router;
