const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { getAll, getOne, complete } = require('./release.controller');

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.patch('/:entryId/complete', protect, complete);

module.exports = router;
