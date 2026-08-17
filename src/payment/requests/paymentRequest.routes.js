const express = require('express');
const router = express.Router();
const controller = require('./paymentRequest.controller');

router.get('/', controller.getAllRequests);
router.post('/', controller.createRequest);
router.get('/:id', controller.getRequestById);
router.post('/:id/action', controller.handleAction);
router.delete('/:id', controller.deleteRequest);

module.exports = router;

