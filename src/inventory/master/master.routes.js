const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../../middleware/auth');
const { getSettings, updateSettings, listMasterRows, createMasterEntry } = require('./master.controller');

// Edits a user's page_access — the same class of action as /api/users/manage,
// so it gets the same Super Admin gate (this legacy CSV-based editor is no
// longer used by the frontend, which now points at the canonical User
// Management page, but the route stays gated regardless of caller).
router.route('/settings')
  .get(protect, requireSuperAdmin, getSettings)
  .put(protect, requireSuperAdmin, updateSettings);

router.route('/')
  .get(listMasterRows)
  .post(protect, createMasterEntry);

module.exports = router;
