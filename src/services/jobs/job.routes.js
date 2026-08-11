const express = require('express');
const router = express.Router();
const { getJobs, createJob, updateJob } = require('./job.controller');

router.get('/', getJobs);
router.post('/', createJob);
router.put('/:id', updateJob);

module.exports = router;
