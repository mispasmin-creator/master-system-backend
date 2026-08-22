const express = require('express');
const router = express.Router();
const controller = require('./paymentRequest.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, controller.getAllRequests);
router.post('/', protect, controller.createRequest);
router.get('/:id', protect, controller.getRequestById);
router.post('/:id/action', protect, controller.handleAction);
router.delete('/:id', protect, controller.deleteRequest);

module.exports = router;

