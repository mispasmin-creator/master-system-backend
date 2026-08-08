const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  listRows,
  listPoHistory,
  editPoGroup,
  previewPoNumber,
  allocatePoNumber,
  submit,
} = require('./generatePo.controller');

router.get('/rows', listRows);
router.get('/po-history', listPoHistory);
router.post('/po-history/edit', protect, editPoGroup);
router.get('/preview-po-number', previewPoNumber);
router.post('/allocate-po-number', protect, allocatePoNumber);
router.post('/submit', protect, submit);

module.exports = router;
