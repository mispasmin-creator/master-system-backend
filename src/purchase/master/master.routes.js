const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const {
  listMasterRows,
  listToleranceRows,
  getMasterFirmNames,
  getIndentOptions,
  getAllOptions,
  createMasterEntry,
  updateMasterEntry,
  deleteMasterEntry,
} = require('./master.controller');

router.get('/firms', getMasterFirmNames);
router.get('/indent-options', getIndentOptions);
router.get('/all-options', getAllOptions);
router.get('/tolerance', listToleranceRows);
router.get('/', listMasterRows);
router.post('/', protect, createMasterEntry);
router.patch('/:id', protect, requireSuperAdmin, updateMasterEntry);
router.delete('/:id', protect, requireSuperAdmin, deleteMasterEntry);

module.exports = router;
