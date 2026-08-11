const express = require('express');
const router = express.Router();
const { getAllTaskTemplates, previewTasks } = require('./task-template.controller');
const { protect } = require('../../middleware/auth');

router.get('/', getAllTaskTemplates);
router.post('/preview', protect, previewTasks);

module.exports = router;
