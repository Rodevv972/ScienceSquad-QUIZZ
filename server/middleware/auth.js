const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to authenticate general users (players or admins)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Token invalide' });
  }
};

// Middleware to authenticate admin users specifically
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token d\'admin manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Check if user is admin
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: 'Accès admin requis' });
    }

    // Get full admin details from database
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(403).json({ message: 'Admin non trouvé ou inactif' });
    }

    req.admin = admin;
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin token verification error:', error);
    return res.status(403).json({ message: 'Token admin invalide' });
  }
};

// Middleware to check specific admin permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({ message: 'Authentification admin requise' });
    }

    // Super admins have all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check specific permission
    if (!req.admin.permissions || !req.admin.permissions[permission]) {
      return res.status(403).json({ 
        message: `Permission requise: ${permission}` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  requirePermission
};