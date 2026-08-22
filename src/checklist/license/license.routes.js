const express = require('express');
const router = express.Router();
const { getAllLicenses, createLicense, updateLicense } = require('./license.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

router.get('/', protect, getAllLicenses);
router.post('/', protect, createLicense);
router.put('/:id', protect, requireSuperAdmin, updateLicense);

module.exports = router;
