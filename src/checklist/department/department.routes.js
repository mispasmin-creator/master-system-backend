const express = require('express');
const router = express.Router();
const { getAllDepartments, createDepartment, updateDepartment } = require('./department.controller');
const { protect } = require('../../middleware/auth');

router.get('/', protect, getAllDepartments);
router.post('/', protect, createDepartment);
router.put('/:id', protect, updateDepartment);

module.exports = router;
