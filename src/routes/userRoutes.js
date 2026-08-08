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
const { protect } = require('../middleware/auth');

router.post('/', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile/password', protect, updatePassword);

// User Management (Settings) — CRUD over the login table.
router.get('/manage', protect, listLoginUsers);
router.post('/manage', protect, createLoginUser);
router.put('/manage/:id', protect, updateLoginUser);
router.delete('/manage/:id', protect, deleteLoginUser);

module.exports = router;
