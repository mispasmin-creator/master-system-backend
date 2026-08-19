const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
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
router.patch('/:id', protect, updateMasterEntry);
router.delete('/:id', protect, deleteMasterEntry);

module.exports = router;
