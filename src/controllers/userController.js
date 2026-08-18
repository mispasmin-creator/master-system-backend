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
    const { username, email, name, password, role, page_access, firm_name } = req.body;
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

    // Create user in the 'login' table
    const user = await prisma.login.create({
      data: {
        username: targetUsername,
        password: hashedPassword,
        role: role || 'user',
        page_access: page_access || null,
        firm_name: firm_name || '',
      },
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        id: user.id,
        username: user.username,
        name: user.username,
        email: user.username,
        role: user.role,
        page_access: user.page_access,
        firm_name: user.firm_name,
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
    const targetUsername = username || email;

    if (!targetUsername || !password) {
      res.status(400);
      throw new Error('Please provide username/email and password');
    }

    // Check for user in the 'login' table
    const user = await prisma.login.findUnique({
      where: { username: targetUsername },
    });

    if (user && (await comparePassword(password, user.password))) {
      const updatedUser = await prisma.login.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });

      res.json({
        _id: updatedUser.id,
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.username,
        email: updatedUser.username,
        role: updatedUser.role,
        page_access: updatedUser.page_access,
        firm_name: updatedUser.firm_name,
        last_login: updatedUser.last_login,
        token: generateToken(updatedUser.id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email/username or password');
    }
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
      res.json({
        _id: user.id,
        id: user.id,
        username: user.username,
        name: user.username,
        email: user.username,
        role: user.role,
        page_access: user.page_access,
        firm_name: user.firm_name,
        last_login: user.last_login,
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

const deriveRole = (pages, explicitRole) => {
  if (explicitRole && typeof explicitRole === 'string' && explicitRole.trim()) {
    return explicitRole.trim().toLowerCase() === 'admin' ? 'admin' : 'user';
  }
  if (!pages) return 'user';
  if (typeof pages === 'string') {
    const trimmed = pages.trim().toLowerCase();
    if (trimmed === 'all' || trimmed === 'super admin' || trimmed === 'admin') return 'admin';
    try {
      const parsed = JSON.parse(pages);
      return deriveRole(parsed);
    } catch {
      return 'user';
    }
  }
  if (Array.isArray(pages)) {
    return pages.some(
      (p) =>
        typeof p === 'string' &&
        (p.toLowerCase() === 'all' || p.toLowerCase() === 'admin' || p.toLowerCase() === 'super admin')
    )
      ? 'admin'
      : 'user';
  }
  if (typeof pages === 'object') {
    if (pages.role === 'admin' || pages.isAdmin === true || pages.isSuperAdmin === true) return 'admin';
    if (Array.isArray(pages.permissions) && pages.permissions.includes('admin')) return 'admin';
    if (pages.admin || pages['admin']) return 'admin';
    return 'user';
  }
  return 'user';
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

    const user = await prisma.login.create({
      data: {
        username,
        password: await hashPassword(password),
        name,
        firm_name: encodeFirm(firmName),
        page_access: encodePages(pages),
        role: deriveRole(pages, explicitRole),
      },
    });

    res.status(201).json(toDisplayUser(user));
  } catch (error) {
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
    const explicitRole = req.body.role || req.body.Role;
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

    const user = await prisma.login.update({
      where: { id },
      data: {
        username: username || existing.username,
        password: passwordToStore,
        name: name,
        firm_name: encodeFirm(firmName),
        page_access: encodePages(pages),
        role: deriveRole(pages, explicitRole),
      },
    });

    res.json(toDisplayUser(user));
  } catch (error) {
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
    await prisma.login.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
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
