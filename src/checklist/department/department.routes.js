const express = require('express');
const router = express.Router();
const { getAllDepartments, createDepartment, updateDepartment } = require('./department.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

router.get('/', protect, getAllDepartments);
router.post('/', protect, createDepartment);
router.put('/:id', protect, requireSuperAdmin, updateDepartment);

module.exports = router;
