const express = require('express');
const router = express.Router();
const { getTallyJobs, advanceTallyJob } = require('./tally.controller');

router.get('/', getTallyJobs);
router.post('/:id/advance', advanceTallyJob);

module.exports = router;
