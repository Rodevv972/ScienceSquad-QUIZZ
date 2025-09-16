const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Game = require('../../models/Game');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin, requirePermission } = require('../../middleware/auth');

// Middleware
router.use(authenticateAdmin);

// Get security alerts and suspicious activities
router.get('/alerts', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const alerts = [];

    // Check for players with suspicious high scores in short time
    const suspiciousPlayers = await Player.find({
      $and: [
        { totalScore: { $gt: 50000 } },
        { gamesPlayed: { $lt: 10 } },
        { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).select('pseudo totalScore gamesPlayed createdAt');

    suspiciousPlayers.forEach(player => {
      alerts.push({
        type: 'suspicious_score',
        severity: 'high',
        message: `Joueur ${player.pseudo} a un score élevé (${player.totalScore}) avec peu de parties (${player.gamesPlayed})`,
        playerId: player._id,
        playerName: player.pseudo,
        createdAt: new Date()
      });
    });

    // Check for multiple accounts from same IP (would require IP tracking in real implementation)
    // This is a placeholder for demonstration
    
    // Check for rapid game creation
    const recentGames = await Game.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    if (recentGames > 20) {
      alerts.push({
        type: 'high_game_creation',
        severity: 'medium',
        message: `${recentGames} parties créées dans la dernière heure`,
        createdAt: new Date()
      });
    }

    // Check for players with many warnings
    const playersWithWarnings = await Player.find({
      warnings: { $gte: 3 }
    }).select('pseudo warnings');

    playersWithWarnings.forEach(player => {
      alerts.push({
        type: 'multiple_warnings',
        severity: 'medium',
        message: `Joueur ${player.pseudo} a ${player.warnings} avertissements`,
        playerId: player._id,
        playerName: player.pseudo,
        createdAt: new Date()
      });
    });

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des alertes de sécurité' });
  }
});

// Get system health check
router.get('/health', requirePermission('systemMaintenance'), async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Check for any recent errors in logs
    const recentErrors = await AdminLog.countDocuments({
      action: 'security_alert',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const health = {
      status: 'healthy',
      database: dbStatus,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      uptime: Math.round(uptime),
      recentErrors,
      timestamp: new Date()
    };

    // Determine overall health status
    if (health.memory.percentage > 90 || recentErrors > 10) {
      health.status = 'warning';
    }
    if (health.memory.percentage > 95 || recentErrors > 20 || !dbStatus.connected) {
      health.status = 'critical';
    }

    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erreur lors de la vérification de l\'état du système'
    });
  }
});

// Toggle maintenance mode
router.post('/maintenance', requirePermission('systemMaintenance'), async (req, res) => {
  try {
    const { enabled, message = 'Maintenance en cours' } = req.body;

    // In a real implementation, this would set a flag in Redis or similar
    // For now, we'll log it as an admin action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'maintenance_mode',
      targetType: 'system',
      details: { 
        enabled,
        message,
        timestamp: new Date()
      }
    });

    res.json({ 
      message: enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé',
      maintenanceEnabled: enabled
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ message: 'Erreur lors du basculement du mode maintenance' });
  }
});

// Get recent admin actions for monitoring
router.get('/monitoring/actions', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const recentActions = await AdminLog.find({
      createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(100);

    // Group actions by type
    const actionsByType = recentActions.reduce((acc, action) => {
      if (!acc[action.action]) {
        acc[action.action] = 0;
      }
      acc[action.action]++;
      return acc;
    }, {});

    // Group actions by admin
    const actionsByAdmin = recentActions.reduce((acc, action) => {
      if (!acc[action.adminUsername]) {
        acc[action.adminUsername] = 0;
      }
      acc[action.adminUsername]++;
      return acc;
    }, {});

    res.json({
      totalActions: recentActions.length,
      actionsByType,
      actionsByAdmin,
      recentActions: recentActions.slice(0, 20) // Last 20 actions
    });
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des données de monitoring' });
  }
});

// Add security alert
router.post('/alerts', async (req, res) => {
  try {
    const { type, severity, message, playerId, playerName } = req.body;

    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'security_alert',
      targetType: playerId ? 'player' : 'system',
      targetId: playerId || null,
      targetName: playerName || null,
      details: { 
        alertType: type,
        severity,
        message,
        timestamp: new Date()
      }
    });

    res.status(201).json({ message: 'Alerte de sécurité créée avec succès' });
  } catch (error) {
    console.error('Error creating security alert:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'alerte de sécurité' });
  }
});

// Helper function to check database connection
async function checkDatabaseConnection() {
  try {
    const mongoose = require('mongoose');
    return {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = router;