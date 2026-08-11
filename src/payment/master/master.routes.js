const express = require('express');
const router = express.Router();
const controller = require('./master.controller');

// Master Dropdowns
router.get('/', controller.getMasterData);
router.post('/fms', controller.createFms);
router.delete('/fms/:id', controller.deleteFms);

module.exports = router;
