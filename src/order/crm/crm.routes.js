const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, markDone } = require('./crm.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/', protect, markDone);

module.exports = router;
