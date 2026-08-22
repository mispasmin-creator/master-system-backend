const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getAll, getOne, complete, reopen, createOrComplete } = require('./kitting.controller');

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);

router.post('/', protect, createOrComplete);
router.patch('/:entryId/complete', protect, complete);
// Reopening undoes a completed entry — the same "revert" semantics gated
// Super Admin-only everywhere else in the app.
router.patch('/:entryId/reopen', protect, requireSuperAdmin, reopen);

module.exports = router;
