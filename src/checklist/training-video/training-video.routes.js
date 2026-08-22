const express = require('express');
const router = express.Router();
const { getAllTrainingVideos, createTrainingVideo, updateTrainingVideo } = require('./training-video.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

router.get('/', protect, getAllTrainingVideos);
router.post('/', protect, createTrainingVideo);
router.put('/:id', protect, requireSuperAdmin, updateTrainingVideo);

module.exports = router;
