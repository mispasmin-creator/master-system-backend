const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, complete, reopen, createOrComplete } = require('./kitting.controller');

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);

router.post('/', protect, createOrComplete);
router.patch('/:entryId/complete', protect, complete);
router.patch('/:entryId/reopen', protect, reopen);

module.exports = router;
