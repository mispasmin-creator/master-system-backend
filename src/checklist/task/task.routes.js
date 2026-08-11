const express = require('express');
const router = express.Router();
const { getAllTasks, batchCreateTasks, completeTask } = require('./task.controller');
const { protect } = require('../../middleware/auth');

router.get('/', getAllTasks);
router.post('/batch', protect, batchCreateTasks);
router.patch('/:id/complete', protect, completeTask);

module.exports = router;
