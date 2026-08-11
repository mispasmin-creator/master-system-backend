const connectDB = require('../../config/db');
const prisma = connectDB.prisma;

// GET /api/repair/settings (list users mapped to Login)
const getUsers = async (req, res) => {
  try {
    const { firm, search } = req.query;
    const where = {};

    if (firm && firm !== 'All') {
      where.firm_name = firm;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firm_name: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.login.findMany({
      where,
      orderBy: { id: 'asc' }
    });

    const mapped = users.map((u) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      role: u.role,
      access: u.page_access,
      firmName: u.firm_name
    }));

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/repair/settings (create user)
const createUser = async (req, res) => {
  try {
    const body = req.body; // { username, password, role, access, firmName }

    const user = await prisma.login.create({
      data: {
        username: body.username || body['User Name'],
        password: body.password || body['Password'],
        role: (body.role || body['Role'] || 'user').toLowerCase(),
        page_access: body.access || body['Page Access'] || null,
        firm_name: body.firmName || body['Firm Name'] || 'Pmmpl'
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        access: user.page_access,
        firmName: user.firm_name
      }
    });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PUT /api/repair/settings/:id (update user)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const targetId = parseInt(id, 10);
    const where = !isNaN(targetId) ? { id: targetId } : { username: id };

    const updateData = {};
    if (body.password !== undefined) updateData.password = body.password;
    if (body.role !== undefined) updateData.role = body.role.toLowerCase();
    if (body.access !== undefined || body.page_access !== undefined) {
      updateData.page_access = body.access || body.page_access;
    }
    if (body.firmName !== undefined || body.firm_name !== undefined) {
      updateData.firm_name = body.firmName || body.firm_name;
    }

    const user = await prisma.login.update({
      where,
      data: updateData
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        access: user.page_access,
        firmName: user.firm_name
      }
    });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/repair/settings/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    const where = !isNaN(targetId) ? { id: targetId } : { username: id };

    await prisma.login.delete({ where });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
