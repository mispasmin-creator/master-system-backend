const express = require('express');
const router = express.Router();
const { getAllLicenses, createLicense, updateLicense } = require('./license.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAllLicenses);
router.post('/', protect, createLicense);
router.put('/:id', protect, updateLicense);

module.exports = router;
