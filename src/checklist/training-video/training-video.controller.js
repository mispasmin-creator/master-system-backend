const { prisma } = require('../../config/db');

// @desc    Get all checklist training videos
// @route   GET /api/checklist/training-video
// @access  Private
const getAllTrainingVideos = async (req, res, next) => {
  try {
    const data = await prisma.checklistTrainingVideo.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a checklist training video
// @route   POST /api/checklist/training-video
// @access  Private
const createTrainingVideo = async (req, res, next) => {
  try {
    const data = await prisma.checklistTrainingVideo.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a checklist training video
// @route   PUT /api/checklist/training-video/:id
// @access  Private
const updateTrainingVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await prisma.checklistTrainingVideo.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() }
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTrainingVideos,
  createTrainingVideo,
  updateTrainingVideo
};
