const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('./master.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

// Account CRUD, Super Admin only (mirrors /api/users/manage).
router.get('/', protect, requireSuperAdmin, getUsers);
router.post('/', protect, requireSuperAdmin, createUser);
router.put('/:username', protect, requireSuperAdmin, updateUser);
router.delete('/:username', protect, requireSuperAdmin, deleteUser);

module.exports = router;
