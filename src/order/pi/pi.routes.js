const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  listPendingPiGroups,
  listPiRecords,
  createPi,
  markReceived,
  markPartial,
  reschedule,
} = require('./pi.controller');

router.get('/pending', listPendingPiGroups);
router.get('/', listPiRecords);
router.post('/', protect, createPi);
router.post('/:id/mark-received', protect, markReceived);
router.post('/:id/partial-payment', protect, markPartial);
router.post('/:id/reschedule', protect, reschedule);

module.exports = router;
