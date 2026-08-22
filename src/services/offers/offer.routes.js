const express = require('express');
const router = express.Router();
const { getOffers, createOffer, updateOffer, convertOffer } = require('./offer.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getOffers);
router.post('/', protect, createOffer);
router.put('/:id', protect, updateOffer);
router.post('/:id/convert', protect, convertOffer);

module.exports = router;
