const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getMasterData, listMasterRows, createMasterEntry, updateMasterEntry, deleteMasterEntry } = require('./master.controller');

router.get('/', getMasterData);
router.get('/rows', listMasterRows);
router.post('/', protect, createMasterEntry);
router.patch('/:id', protect, requireSuperAdmin, updateMasterEntry);
router.delete('/:id', protect, requireSuperAdmin, deleteMasterEntry);

module.exports = router;
