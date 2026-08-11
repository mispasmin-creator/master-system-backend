const express = require('express');
const router = express.Router();

router.use('/entry', require('./entry/entry.routes'));
router.use('/kitting', require('./kitting/kitting.routes'));
router.use('/audit', require('./audit/audit.routes'));
router.use('/posting', require('./posting/posting.routes'));
router.use('/release', require('./release/release.routes'));
router.use('/dashboard', require('./dashboard/dashboard.routes'));

module.exports = router;
