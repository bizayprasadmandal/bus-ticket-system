const jwt = require('jsonwebtoken');
const { User, UserRole } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with their roles
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: UserRole,
          as: 'roles',
          where: { is_active: true },
          required: false,
        },
      ],
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = userRoles.some(role => 
      roles.includes(role.role) && role.is_active
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRoles = req.user.roles || [];
    const hasPermission = userRoles.some(role => {
      if (!role.is_active) return false;
      const permissions = role.permissions || [];
      return permissions.includes(permission) || permissions.includes('*');
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
};