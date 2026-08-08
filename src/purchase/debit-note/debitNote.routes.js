const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, submitDebitNote, updateDebitNote } = require('./debitNote.controller');

router.get('/data', listData);
router.post('/submit', protect, submitDebitNote);
router.post('/update/:debitNoteId', protect, updateDebitNote);

module.exports = router;
