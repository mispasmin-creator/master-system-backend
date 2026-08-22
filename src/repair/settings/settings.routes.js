const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('./settings.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

// Account CRUD, Super Admin only (mirrors /api/users/manage).
router.get('/', protect, requireSuperAdmin, getUsers);
router.post('/', protect, requireSuperAdmin, createUser);
router.put('/:id', protect, requireSuperAdmin, updateUser);
router.delete('/:id', protect, requireSuperAdmin, deleteUser);

module.exports = router;
