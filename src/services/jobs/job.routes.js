const express = require('express');
const router = express.Router();
const { getJobs, createJob, updateJob } = require('./job.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getJobs);
router.post('/', protect, createJob);
router.put('/:id', protect, updateJob);

module.exports = router;
