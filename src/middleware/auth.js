const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = parseInt(decoded.id, 10);
      if (isNaN(userId)) {
        return res.status(401).json({ message: 'Not authorized, invalid token payload' });
      }

      // Verify user in database
      const user = await prisma.login.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true,
          page_access: true,
          firm_name: true,
          name: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found or account removed' });
      }

      if (user.isActive === false) {
        return res.status(403).json({ message: 'User account has been deactivated. Please contact administrator.' });
      }

      // Add fresh user info to request
      req.user = user;

      next();
    } catch (error) {
      console.error('Protect middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Canonical role tiers: 'super_admin' | 'admin' | 'user'. `protect` already
// refetches a fresh `role` from the DB on every request, so this is a plain
// in-memory check with no extra DB cost.
const requireRole = (...allowedRoles) => (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
    return res.status(403).json({ message: 'Not authorized: insufficient role for this action.' });
  }
  next();
};

const requireSuperAdmin = requireRole('super_admin');

module.exports = { protect, requireRole, requireSuperAdmin };

