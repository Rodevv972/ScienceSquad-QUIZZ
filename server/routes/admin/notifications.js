const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');
const Player = require('../../models/Player');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin } = require('../../middleware/auth');

// Middleware
router.use(authenticateAdmin);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = '',
      isGlobal = ''
    } = req.query;

    const query = { isActive: true };
    
    if (type) query.type = type;
    if (isGlobal !== '') query.isGlobal = isGlobal === 'true';

    const notifications = await Notification
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications' });
  }
});

// Send global notification
router.post('/global', async (req, res) => {
  try {
    const { title, message, type = 'info', priority = 'normal', expiresAt } = req.body;

    const notification = new Notification({
      type,
      title,
      message,
      sender: req.admin.username,
      isGlobal: true,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await notification.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'server_announcement',
      targetType: 'system',
      details: { title, type, priority }
    });

    res.status(201).json({ 
      message: 'Notification globale envoyée avec succès', 
      notification 
    });
  } catch (error) {
    console.error('Error sending global notification:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la notification globale' });
  }
});

// Send personal notification to specific players
router.post('/personal', async (req, res) => {
  try {
    const { title, message, recipients, type = 'personal', priority = 'normal' } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ message: 'Aucun destinataire spécifié' });
    }

    // Get player details
    const players = await Player.find({ 
      $or: [
        { _id: { $in: recipients } },
        { pseudo: { $in: recipients } }
      ]
    });

    if (players.length === 0) {
      return res.status(404).json({ message: 'Aucun joueur trouvé' });
    }

    const notificationRecipients = players.map(player => ({
      playerId: player._id,
      pseudo: player.pseudo,
      isRead: false
    }));

    const notification = new Notification({
      type,
      title,
      message,
      sender: req.admin.username,
      recipients: notificationRecipients,
      isGlobal: false,
      priority
    });

    await notification.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'player_send_message',
      targetType: 'player',
      details: { 
        title, 
        recipientCount: players.length,
        recipients: players.map(p => p.pseudo)
      }
    });

    res.status(201).json({ 
      message: `Notification envoyée à ${players.length} joueur(s)`, 
      notification,
      sentTo: players.length
    });
  } catch (error) {
    console.error('Error sending personal notification:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la notification personnelle' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    notification.isActive = false;
    await notification.save();

    res.json({ message: 'Notification supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la notification' });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRecipients: {
            $sum: {
              $cond: [
                { $eq: ['$isGlobal', true] },
                1000, // Approximate for global notifications
                { $size: '$recipients' }
              ]
            }
          }
        }
      }
    ]);

    const readStats = await Notification.aggregate([
      { $match: { isActive: true, isGlobal: false } },
      { $unwind: '$recipients' },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          totalRead: {
            $sum: {
              $cond: ['$recipients.isRead', 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      byType: stats,
      readRate: readStats[0] || { totalSent: 0, totalRead: 0 }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;