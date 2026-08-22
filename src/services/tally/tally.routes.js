const express = require('express');
const router = express.Router();
const { getTallyJobs, advanceTallyJob } = require('./tally.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getTallyJobs);
router.post('/:id/advance', protect, advanceTallyJob);

module.exports = router;
