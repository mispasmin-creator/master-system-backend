const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
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
router.patch('/:id', protect, updateMasterEntry);
router.delete('/:id', protect, deleteMasterEntry);

module.exports = router;
