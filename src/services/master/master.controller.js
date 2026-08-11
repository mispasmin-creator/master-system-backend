const connectDB = require('../../config/db');
const prisma = connectDB.prisma;
const bcrypt = require('bcryptjs');

// GET /api/services/master
const getMasterDropdowns = async (req, res) => {
  try {
    const rows = await prisma.serviceMasterDropdown.findMany();

    const departments = [...new Set(rows.map(r => r.department).filter(Boolean))];
    const groupHeads = [...new Set(rows.map(r => r.groupHead).filter(Boolean))];
    const firmNames = [...new Set(rows.map(r => r.firmName).filter(Boolean))];
    const fmsNames = [...new Set(rows.map(r => r.fmsName).filter(Boolean))];

    res.json({
      success: true,
      data: {
        departments: departments.length ? departments : ["IT", "Logistics", "Maintenance", "Finance", "HR", "Store"],
        groupHeads: groupHeads.length ? groupHeads : ["Management", "Operations", "Finance Head"],
        firmNames: firmNames.length ? firmNames : ["PMMPL", "PMM Logisol", "PMM Retail", "PMM Infra"],
        fmsNames: fmsNames.length ? fmsNames : ["Repair FMS", "Store FMS", "Utility FMS", "Service FMS"]
      }
    });
  } catch (err) {
    console.error('getMasterDropdowns error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/services/settings (Users list)
const getUsers = async (req, res) => {
  try {
    const users = await prisma.login.findMany({
      orderBy: { id: 'asc' }
    });

    const sanitized = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      firms: u.firm_name,
      pages: u.page_access,
      lastLogin: u.last_login
    }));

    res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/services/settings (Create user)
const createUser = async (req, res) => {
  try {
    const { username, password, name, role, status, firms, pages } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const prefixedPages = pages
      ? pages.split(',').map(p => p.trim()).map(p => p.startsWith('Services_') ? p : `Services_${p}`).join(', ')
      : 'Services_Dashboard';

    const newUser = await prisma.login.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        name: name ? name.trim() : username.trim(),
        role: role || 'user',
        firm_name: firms || 'PMMPL',
        page_access: prefixedPages
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        firms: newUser.firm_name,
        pages: newUser.page_access
      }
    });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/services/settings/:username (Update user)
const updateUser = async (req, res) => {
  try {
    const { username } = req.params;
    const { password, name, role, firms, pages } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (firms !== undefined) data.firm_name = firms;
    if (pages !== undefined) {
      data.page_access = pages
        .split(',')
        .map(p => p.trim())
        .map(p => p.startsWith('Services_') ? p : `Services_${p}`)
        .join(', ');
    }

    if (password && password.trim()) {
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.login.update({
      where: { username },
      data
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        firms: updatedUser.firm_name,
        pages: updatedUser.page_access
      }
    });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/services/settings/:username (Delete user)
const deleteUser = async (req, res) => {
  try {
    const { username } = req.params;
    await prisma.login.delete({
      where: { username }
    });
    res.json({ success: true, message: `User @${username} deleted successfully.` });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getMasterDropdowns,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
