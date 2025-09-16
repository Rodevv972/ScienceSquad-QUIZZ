const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Game = require('../../models/Game');
const Question = require('../../models/Question');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin, requirePermission } = require('../../middleware/auth');

// Middleware
router.use(authenticateAdmin);

// Get dashboard statistics
router.get('/dashboard', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const [
      totalPlayers,
      onlinePlayers,
      totalGames,
      activeGames,
      totalQuestions,
      recentActions
    ] = await Promise.all([
      Player.countDocuments(),
      Player.countDocuments({ isOnline: true }),
      Game.countDocuments(),
      Game.countDocuments({ status: 'active' }),
      Question.countDocuments({ isActive: true }),
      AdminLog.find().sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      totalPlayers,
      onlinePlayers,
      totalGames,
      activeGames,
      totalQuestions,
      recentActions
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

// Get player statistics over time
router.get('/players/timeline', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let groupStage;
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          }
        };
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          }
        };
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          }
        };
        break;
    }

    const playerStats = await Player.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { 
        $group: {
          ...groupStage,
          newPlayers: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json(playerStats);
  } catch (error) {
    console.error('Error fetching player timeline:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la timeline' });
  }
});

// Get game statistics
router.get('/games/stats', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const gameStats = await Game.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averagePlayers: { $avg: { $size: '$players' } },
          averageQuestions: { $avg: { $size: '$questions' } }
        }
      }
    ]);

    const completionStats = await Game.aggregate([
      { $match: { status: 'finished' } },
      {
        $group: {
          _id: null,
          averageDuration: {
            $avg: {
              $subtract: ['$endedAt', '$createdAt']
            }
          },
          totalFinished: { $sum: 1 }
        }
      }
    ]);

    res.json({
      gameStats,
      completionStats: completionStats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques de jeu' });
  }
});

// Get leaderboard statistics
router.get('/leaderboard', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const topPlayers = await Player
      .find({ totalScore: { $gt: 0 } })
      .sort({ totalScore: -1 })
      .limit(10)
      .select('pseudo totalScore gamesPlayed statistics.averageScore');

    const scoreDistribution = await Player.aggregate([
      {
        $bucket: {
          groupBy: '$totalScore',
          boundaries: [0, 1000, 5000, 10000, 25000, 50000, 100000],
          default: '100000+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      topPlayers,
      scoreDistribution
    });
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du leaderboard' });
  }
});

// Get real-time server activity
router.get('/activity/realtime', requirePermission('viewStatistics'), async (req, res) => {
  try {
    const [
      activeGames,
      onlinePlayers,
      recentGames,
      systemLoad
    ] = await Promise.all([
      Game.find({ status: 'active' })
        .select('gameId createdBy players.length currentQuestion createdAt')
        .limit(5),
      Player.find({ isOnline: true })
        .select('pseudo lastActive')
        .sort({ lastActive: -1 })
        .limit(10),
      Game.find({ status: 'finished' })
        .select('gameId createdBy players.length endedAt')
        .sort({ endedAt: -1 })
        .limit(5),
      // Simple system metrics (in a real app, you'd use actual system monitoring)
      Promise.resolve({
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date()
      })
    ]);

    res.json({
      activeGames: activeGames.map(game => ({
        ...game.toObject(),
        playerCount: game.players ? game.players.length : 0
      })),
      onlinePlayers,
      recentGames: recentGames.map(game => ({
        ...game.toObject(),
        playerCount: game.players ? game.players.length : 0
      })),
      systemLoad
    });
  } catch (error) {
    console.error('Error fetching real-time activity:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'activité en temps réel' });
  }
});

module.exports = router;