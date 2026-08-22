const { prisma } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Manually hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password (supports bcrypt hash and legacy plain-text fallback)
const comparePassword = async (enteredPassword, storedPassword) => {
  if (!storedPassword) return false;
  if (enteredPassword === storedPassword) return true;
  try {
    return await bcrypt.compare(enteredPassword, storedPassword);
  } catch (err) {
    return false;
  }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { username, email, name, password, role, page_access, firm_name, is_active, isActive } = req.body;
    const targetUsername = username || email || name;

    if (!targetUsername || !password) {
      res.status(400);
      throw new Error('Please provide username/email and password');
    }

    // Check if user exists
    const userExists = await prisma.login.findUnique({
      where: { username: targetUsername },
    });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(password);
    const activeStatus = is_active !== undefined ? Boolean(is_active) : (isActive !== undefined ? Boolean(isActive) : true);

    // Create user in the 'login' table
    const user = await prisma.login.create({
      data: {
        username: targetUsername,
        password: hashedPassword,
        role: role || 'user',
        page_access: page_access || null,
        firm_name: firm_name || '',
        name: name || null,
        isActive: activeStatus,
      },
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.username,
        role: user.role,
        page_access: user.page_access,
        firm_name: user.firm_name,
        is_active: user.isActive,
        token: generateToken(user.id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const targetUsername = (username || email || '').trim();

    if (!targetUsername || !password) {
      res.status(400);
      throw new Error('Please provide username/email and password');
    }

    // Check for user in the 'login' table
    const user = await prisma.login.findUnique({
      where: { username: targetUsername },
    });

    if (!user) {
      res.status(401);
      throw new Error('Invalid email/username or password');
    }

    // Check if user account is deactivated
    if (user.isActive === false) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401);
      throw new Error('Invalid email/username or password');
    }

    // Auto-upgrade plaintext legacy password to bcrypt hash on successful login
    let updateData = { last_login: new Date() };
    if (user.password === password) {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.login.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      _id: updatedUser.id,
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name || updatedUser.username,
      email: updatedUser.username,
      role: updatedUser.role,
      page_access: updatedUser.page_access,
      firm_name: updatedUser.firm_name,
      last_login: updatedUser.last_login,
      is_active: updatedUser.isActive,
      token: generateToken(updatedUser.id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const userId = parseInt(req.user.id, 10);
    if (isNaN(userId)) {
      res.status(400);
      throw new Error('Invalid user ID');
    }

    const user = await prisma.login.findUnique({
      where: { id: userId },
    });

    if (user) {
      if (user.isActive === false) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      res.json({
        _id: user.id,
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.username,
        role: user.role,
        page_access: user.page_access,
        firm_name: user.firm_name,
        last_login: user.last_login,
        is_active: user.isActive,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/users/profile/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const userId = parseInt(req.user.id, 10);
    if (isNaN(userId)) {
      res.status(400);
      throw new Error('Invalid user ID');
    }

    const { password } = req.body;
    if (!password) {
      res.status(400);
      throw new Error('Please provide a new password');
    }

    const hashedPassword = await hashPassword(password);

    await prisma.login.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// User Management (Settings page) — CRUD over the SAME `login` table the login
// page authenticates against. Uses the reference component's display-key shape
// ("User Name" / "Password" / "Name" / "Firm Name" / "Pages") so the frontend
// stays unchanged except for swapping Supabase calls for these endpoints.
// ---------------------------------------------------------------------------

// Canonical 3-tier roles: 'super_admin' | 'admin' | 'user'. An explicit role
// always wins; 'super_admin'/'super admin' is recognized as its own tier now
// (it used to collapse into 'admin' with no extra privilege — see
// requireSuperAdmin in middleware/auth.js for what that tier actually grants).
const normalizeExplicitRole = (explicitRole) => {
  const r = String(explicitRole || '').trim().toLowerCase().replace(/[\s-]/g, '_');
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'user') return 'user';
  return null;
};

const deriveRole = (pages, explicitRole) => {
  const normalized = normalizeExplicitRole(explicitRole);
  if (normalized) return normalized;
  if (!pages) return 'user';
  if (typeof pages === 'string') {
    const trimmed = pages.trim().toLowerCase();
    if (trimmed === 'super admin' || trimmed === 'super_admin') return 'super_admin';
    if (trimmed === 'all' || trimmed === 'admin') return 'admin';
    try {
      const parsed = JSON.parse(pages);
      return deriveRole(parsed);
    } catch {
      return 'user';
    }
  }
  if (Array.isArray(pages)) {
    if (pages.some((p) => typeof p === 'string' && ['super admin', 'super_admin'].includes(p.toLowerCase())))
      return 'super_admin';
    return pages.some((p) => typeof p === 'string' && (p.toLowerCase() === 'all' || p.toLowerCase() === 'admin'))
      ? 'admin'
      : 'user';
  }
  if (typeof pages === 'object') {
    if (pages.isSuperAdmin === true || pages.role === 'super_admin') return 'super_admin';
    if (pages.role === 'admin' || pages.isAdmin === true) return 'admin';
    if (Array.isArray(pages.permissions) && pages.permissions.includes('admin')) return 'admin';
    if (pages.admin || pages['admin']) return 'admin';
    return 'user';
  }
  return 'user';
};

// Enforces "exactly one Super Admin at all times": rejects promoting/creating
// a second one, and rejects demoting or deleting the last remaining one.
const assertSingleSuperAdminInvariant = async ({ targetUserId = null, newRole, isDelete = false }) => {
  const existing = await prisma.login.findMany({ where: { role: 'super_admin' }, select: { id: true } });
  const existingIds = new Set(existing.map((u) => u.id));

  if (isDelete || (newRole && newRole !== 'super_admin')) {
    // Losing super_admin status (via delete or demotion) — only allowed if
    // this user isn't the last one, or isn't a super_admin at all.
    if (targetUserId != null && existingIds.has(targetUserId) && existingIds.size <= 1) {
      const err = new Error('Cannot remove the only Super Admin. Promote another user to Super Admin first.');
      err.statusCode = 400;
      throw err;
    }
    return;
  }

  if (newRole === 'super_admin') {
    const otherSuperAdmins = [...existingIds].filter((id) => id !== targetUserId);
    if (otherSuperAdmins.length > 0) {
      const err = new Error('A Super Admin already exists. Demote the current Super Admin before promoting another.');
      err.statusCode = 400;
      throw err;
    }
  }
};

// "Firm Name" comes in as "all" (string) or an array of firm keys; the login
// table stores a plain string, so arrays are JSON-encoded (parseFirms on the
// frontend already decodes JSON / "all" / CSV).
const encodeFirm = (firm) => {
  if (Array.isArray(firm)) return firm.includes('all') ? 'all' : JSON.stringify(firm);
  if (firm && typeof firm === 'object') return JSON.stringify(firm);
  return firm == null ? '' : String(firm);
};

// "Pages" is already a string from the UI ("viewonly"/"all"/"super admin" or a
// JSON string); keep as-is, JSON-encode only if an object/array slips through.
// Seamlessly stores new structured permission shape (system -> pages -> firms/readOnly).
const encodePages = (pages) => {
  if (pages == null) return null;
  if (typeof pages === 'string') return pages;
  try {
    return JSON.stringify(pages);
  } catch (err) {
    return String(pages);
  }
};

// The password hash is deliberately never returned — the edit form asks for a
// new password instead of pre-filling the stored one.
const toDisplayUser = (u) => ({
  id: u.id,
  'User Name': u.username,
  Name: u.name || '',
  'Firm Name': u.firm_name || '',
  Pages: u.page_access || '',
  role: u.role,
  last_login: u.last_login,
  is_active: u.isActive !== undefined ? u.isActive : true,
  isActive: u.isActive !== undefined ? u.isActive : true,
});

// @desc    List all users from the login table (User Management grid)
// @route   GET /api/users/manage
// @access  Private
const listLoginUsers = async (req, res, next) => {
  try {
    const users = await prisma.login.findMany({ orderBy: { username: 'asc' } });
    res.json(users.map(toDisplayUser));
  } catch (error) {
    next(error);
  }
};

// @desc    Create a login user
// @route   POST /api/users/manage
// @access  Private
const createLoginUser = async (req, res, next) => {
  try {
    const username = req.body['User Name'] || req.body.username || req.body.userName;
    const password = req.body['Password'] || req.body.password;
    if (!username || !password) {
      res.status(400);
      throw new Error('Username and Password are required');
    }

    const exists = await prisma.login.findUnique({ where: { username } });
    if (exists) {
      res.status(400);
      throw new Error('A user with this username already exists');
    }

    const pages =
      req.body['Pages'] ??
      req.body.pages ??
      req.body.page_access ??
      req.body.pageAccess ??
      req.body.systemPermissions ??
      req.body.pageFirms;
    const explicitRole = req.body.role || req.body.Role;
    const firmName =
      req.body['Firm Name'] ??
      req.body.firm_name ??
      req.body.firmName ??
      req.body.firms;
    const name = req.body['Name'] ?? req.body.name ?? null;
    const activeStatus =
      req.body.is_active !== undefined
        ? Boolean(req.body.is_active)
        : req.body.isActive !== undefined
        ? Boolean(req.body.isActive)
        : true;

    const role = deriveRole(pages, explicitRole);
    await assertSingleSuperAdminInvariant({ targetUserId: null, newRole: role });

    const user = await prisma.login.create({
      data: {
        username,
        password: await hashPassword(password),
        name,
        firm_name: encodeFirm(firmName),
        page_access: encodePages(pages),
        role,
        isActive: activeStatus,
      },
    });

    res.status(201).json(toDisplayUser(user));
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Update a login user. The password is re-hashed whenever one is
//          supplied; omitting it keeps the current password.
// @route   PUT /api/users/manage/:id
// @access  Private
const updateLoginUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid user id');
    }

    const existing = await prisma.login.findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('User not found');
    }

    const username = req.body['User Name'] || req.body.username || req.body.userName;
    const password = req.body['Password'] || req.body.password;
    const pages =
      req.body['Pages'] !== undefined
        ? req.body['Pages']
        : req.body.pages !== undefined
        ? req.body.pages
        : req.body.page_access !== undefined
        ? req.body.page_access
        : req.body.systemPermissions !== undefined
        ? req.body.systemPermissions
        : req.body.pageFirms !== undefined
        ? req.body.pageFirms
        : existing.page_access;
    // Falls back to the existing role (not re-derived from pages) when the
    // caller doesn't explicitly send one, so an unrelated field edit (name,
    // firm, active status) can never silently change — or accidentally
    // demote — someone's role tier.
    const explicitRole = req.body.role || req.body.Role || existing.role;
    const firmName =
      req.body['Firm Name'] !== undefined
        ? req.body['Firm Name']
        : req.body.firm_name !== undefined
        ? req.body.firm_name
        : req.body.firmName !== undefined
        ? req.body.firmName
        : req.body.firms !== undefined
        ? req.body.firms
        : existing.firm_name;
    const name =
      req.body['Name'] !== undefined
        ? req.body['Name']
        : req.body.name !== undefined
        ? req.body.name
        : existing.name;

    const activeStatus =
      req.body.is_active !== undefined
        ? Boolean(req.body.is_active)
        : req.body.isActive !== undefined
        ? Boolean(req.body.isActive)
        : existing.isActive;

    // Uniqueness check if username changed
    if (username && username !== existing.username) {
      const clash = await prisma.login.findUnique({ where: { username } });
      if (clash) {
        res.status(400);
        throw new Error('A user with this username already exists');
      }
    }

    // A password is only sent when the admin actually typed a new one; an
    // omitted/blank field leaves the stored hash untouched.
    let passwordToStore = existing.password;
    if (password) {
      passwordToStore = await hashPassword(password);
    }

    const role = deriveRole(pages, explicitRole);
    await assertSingleSuperAdminInvariant({ targetUserId: id, newRole: role });

    const user = await prisma.login.update({
      where: { id },
      data: {
        username: username || existing.username,
        password: passwordToStore,
        name: name,
        firm_name: encodeFirm(firmName),
        page_access: encodePages(pages),
        role,
        isActive: activeStatus,
      },
    });

    res.json(toDisplayUser(user));
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// @desc    Delete a login user
// @route   DELETE /api/users/manage/:id
// @access  Private
const deleteLoginUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400);
      throw new Error('Invalid user id');
    }
    await assertSingleSuperAdminInvariant({ targetUserId: id, isDelete: true });
    await prisma.login.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = {
  registerUser,
  authUser,
  getUserProfile,
  listLoginUsers,
  createLoginUser,
  updateLoginUser,
  deleteLoginUser,
  updatePassword,
};
