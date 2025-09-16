const express = require('express');
const router = express.Router();
const Admin = require('../../models/Admin');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin, requirePermission } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');

// Middleware
router.use(authenticateAdmin);

// Get all admins
router.get('/', requirePermission('manageAdmins'), async (req, res) => {
  try {
    const admins = await Admin
      .find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des administrateurs' });
  }
});

// Create new admin
router.post('/', requirePermission('manageAdmins'), async (req, res) => {
  try {
    const { username, password, role = 'admin', permissions = {} } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Cet administrateur existe déjà' });
    }

    const defaultPermissions = {
      manageGames: true,
      managePlayers: true,
      manageQuestions: true,
      manageAdmins: false,
      viewStatistics: true,
      systemMaintenance: false
    };

    const newAdmin = new Admin({
      username,
      password,
      role,
      permissions: { ...defaultPermissions, ...permissions },
      createdBy: req.admin.username
    });

    await newAdmin.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'admin_add',
      targetType: 'admin',
      targetId: newAdmin._id.toString(),
      targetName: username,
      details: { role, permissions }
    });

    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    res.status(201).json({ 
      message: 'Administrateur créé avec succès', 
      admin: adminResponse 
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'administrateur' });
  }
});

// Update admin permissions
router.put('/:id/permissions', requirePermission('manageAdmins'), async (req, res) => {
  try {
    const { permissions, role } = req.body;

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' });
    }

    // Can't modify super_admin unless you are super_admin
    if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Seul un super administrateur peut modifier un autre super administrateur' });
    }

    const oldPermissions = { ...admin.permissions };
    const oldRole = admin.role;

    if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
    if (role) admin.role = role;

    await admin.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'admin_modify_permissions',
      targetType: 'admin',
      targetId: admin._id.toString(),
      targetName: admin.username,
      details: { 
        oldPermissions, 
        newPermissions: admin.permissions,
        oldRole,
        newRole: admin.role
      }
    });

    res.json({ message: 'Permissions mises à jour avec succès' });
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des permissions' });
  }
});

// Deactivate admin
router.delete('/:id', requirePermission('manageAdmins'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' });
    }

    // Can't deactivate yourself
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous désactiver vous-même' });
    }

    // Can't deactivate super_admin unless you are super_admin
    if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Seul un super administrateur peut désactiver un autre super administrateur' });
    }

    admin.isActive = false;
    await admin.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'admin_remove',
      targetType: 'admin',
      targetId: admin._id.toString(),
      targetName: admin.username
    });

    res.json({ message: 'Administrateur désactivé avec succès' });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    res.status(500).json({ message: 'Erreur lors de la désactivation de l\'administrateur' });
  }
});

// Change admin password
router.put('/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Can only change your own password unless you're super_admin
    if (req.params.id !== req.admin._id.toString() && req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Vous ne pouvez changer que votre propre mot de passe' });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' });
    }

    // Verify current password if changing your own
    if (req.params.id === req.admin._id.toString()) {
      const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe' });
  }
});

// Get admin action logs
router.get('/logs', requirePermission('manageAdmins'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      admin = '',
      action = '',
      startDate,
      endDate
    } = req.query;

    const query = {};
    
    if (admin) query.adminUsername = admin;
    if (action) query.action = action;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AdminLog
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdminLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des logs' });
  }
});

module.exports = router;