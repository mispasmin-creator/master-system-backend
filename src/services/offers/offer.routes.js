const express = require('express');
const router = express.Router();
const { getOffers, createOffer, updateOffer, convertOffer } = require('./offer.controller');

router.get('/', getOffers);
router.post('/', createOffer);
router.put('/:id', updateOffer);
router.post('/:id/convert', convertOffer);

module.exports = router;
