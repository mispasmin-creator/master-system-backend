const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, issue } = require('./debitNote.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:id', protect, issue);

module.exports = router;
