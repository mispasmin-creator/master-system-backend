const express = require('express');
const router = express.Router();
const {
  registerUser,
  authUser,
  getUserProfile,
  listLoginUsers,
  createLoginUser,
  updateLoginUser,
  deleteLoginUser,
  updatePassword,
} = require('../controllers/userController');
const { protect, requireSuperAdmin } = require('../middleware/auth');

// Account creation is a User Management action, not public self-signup —
// confirmed unused by any frontend caller (see git history/audit notes).
router.post('/', protect, requireSuperAdmin, registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile/password', protect, updatePassword);

// User Management (Settings) — CRUD over the login table. Super Admin only:
// this is the exact endpoint that let any logged-in user edit/delete any
// account (including granting themselves admin) before this fix.
router.get('/manage', protect, requireSuperAdmin, listLoginUsers);
router.post('/manage', protect, requireSuperAdmin, createLoginUser);
router.put('/manage/:id', protect, requireSuperAdmin, updateLoginUser);
router.delete('/manage/:id', protect, requireSuperAdmin, deleteLoginUser);

module.exports = router;
