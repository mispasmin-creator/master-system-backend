const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listPending, listHistory, submit } = require('./returnDispatch.controller');

router.get('/pending', listPending);
router.get('/history', listHistory);
router.post('/:id', protect, submit);

module.exports = router;
