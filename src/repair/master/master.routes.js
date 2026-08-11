const express = require('express');
const router = express.Router();
const {
  getMasterDropdowns,
  addMasterDropdown,
  updateMasterDropdown,
  deleteMasterDropdown
} = require('./master.controller');

router.get('/', getMasterDropdowns);
router.post('/', addMasterDropdown);
router.put('/:id', updateMasterDropdown);
router.delete('/:id', deleteMasterDropdown);

module.exports = router;
