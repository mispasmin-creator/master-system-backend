const express = require('express');
const router = express.Router();
const { getAllCompanies, createCompany, updateCompany } = require('./company.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAllCompanies);
router.post('/', protect, createCompany);
router.put('/:id', protect, updateCompany);

module.exports = router;
