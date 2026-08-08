const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listReceipts, createReceipt, updateUploadSo } = require('./receipt.controller');

router.get('/', listReceipts);
router.post('/', protect, createReceipt);
router.patch('/upload-so', protect, updateUploadSo);

module.exports = router;
