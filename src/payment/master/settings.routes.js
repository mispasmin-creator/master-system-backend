const express = require('express');
const router = express.Router();
const controller = require('./master.controller');
const { protect, requireSuperAdmin } = require('../../middleware/auth');

// User Settings — account CRUD, Super Admin only (mirrors /api/users/manage).
router.get('/', protect, requireSuperAdmin, controller.getUsers);
router.post('/', protect, requireSuperAdmin, controller.createUser);
router.put('/:username', protect, requireSuperAdmin, controller.updateUser);
router.delete('/:username', protect, requireSuperAdmin, controller.deleteUser);

module.exports = router;
