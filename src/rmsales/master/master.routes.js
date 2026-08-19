const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getMasterData, listMasterRows, createMasterEntry, updateMasterEntry, deleteMasterEntry } = require('./master.controller');

router.get('/', getMasterData);
router.get('/rows', listMasterRows);
router.post('/', protect, createMasterEntry);
router.patch('/:id', protect, updateMasterEntry);
router.delete('/:id', protect, deleteMasterEntry);

module.exports = router;
