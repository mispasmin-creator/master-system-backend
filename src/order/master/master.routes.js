const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const {
  listMasterRows,
  getAllOptions,
  createMasterEntry,
  updateMasterEntry,
  deleteMasterEntry,
} = require('./master.controller');

router.get('/all-options', getAllOptions);
router.get('/', listMasterRows);
router.post('/', protect, createMasterEntry);
router.patch('/:id', protect, requireSuperAdmin, updateMasterEntry);
router.delete('/:id', protect, requireSuperAdmin, deleteMasterEntry);

module.exports = router;
