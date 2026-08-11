const express = require('express');
const router = express.Router();
const { getAllTrainingVideos, createTrainingVideo, updateTrainingVideo } = require('./training-video.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAllTrainingVideos);
router.post('/', protect, createTrainingVideo);
router.put('/:id', protect, updateTrainingVideo);

module.exports = router;
