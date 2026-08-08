const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { listData, coordinate } = require('./purchaserCoordinate.controller');

router.get('/data', listData);
router.post('/coordinate/:coordinateId', protect, coordinate);

module.exports = router;
