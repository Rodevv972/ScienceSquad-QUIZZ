const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Ban = require('../../models/Ban');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin } = require('../../middleware/auth');

// Middleware to authenticate admin
router.use(authenticateAdmin);

// Get all players with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = 'all', // all, online, offline, banned
      sortBy = 'lastActive',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Search filter
    if (search) {
      query.pseudo = { $regex: search, $options: 'i' };
    }
    
    // Status filter
    switch (status) {
      case 'online':
        query.isOnline = true;
        break;
      case 'offline':
        query.isOnline = false;
        break;
      case 'banned':
        query.isBanned = true;
        break;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const players = await Player
      .find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-gameHistory'); // Exclude large arrays for performance

    const total = await Player.countDocuments(query);

    res.json({
      players,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des joueurs' });
  }
});

// Get player details with full history
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Joueur non trouvé' });
    }

    // Get ban history
    const bans = await Ban.find({ playerId: player._id }).sort({ createdAt: -1 });

    res.json({ player, bans });
  } catch (error) {
    console.error('Error fetching player details:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du joueur' });
  }
});

// Ban a player
router.post('/:id/ban', async (req, res) => {
  try {
    const { reason, banType = 'temporary', duration = 24 } = req.body;
    
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Joueur non trouvé' });
    }

    const expiresAt = banType === 'permanent' ? null : new Date(Date.now() + duration * 60 * 60 * 1000);

    // Create ban record
    const ban = new Ban({
      playerId: player._id,
      pseudo: player.pseudo,
      reason,
      bannedBy: req.admin.username,
      banType,
      expiresAt
    });
    await ban.save();

    // Update player
    player.isBanned = true;
    player.banExpiresAt = expiresAt;
    await player.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'player_ban',
      targetType: 'player',
      targetId: player._id.toString(),
      targetName: player.pseudo,
      details: { reason, banType, duration }
    });

    res.json({ message: 'Joueur banni avec succès', ban });
  } catch (error) {
    console.error('Error banning player:', error);
    res.status(500).json({ message: 'Erreur lors du bannissement' });
  }
});

// Unban a player
router.post('/:id/unban', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Joueur non trouvé' });
    }

    // Deactivate current bans
    await Ban.updateMany(
      { playerId: player._id, isActive: true },
      { isActive: false }
    );

    // Update player
    player.isBanned = false;
    player.banExpiresAt = null;
    await player.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'player_unban',
      targetType: 'player',
      targetId: player._id.toString(),
      targetName: player.pseudo
    });

    res.json({ message: 'Joueur débanni avec succès' });
  } catch (error) {
    console.error('Error unbanning player:', error);
    res.status(500).json({ message: 'Erreur lors du débannissement' });
  }
});

// Reset player score
router.post('/:id/reset-score', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Joueur non trouvé' });
    }

    const oldScore = player.totalScore;
    player.totalScore = 0;
    player.statistics.averageScore = 0;
    player.statistics.bestScore = 0;
    await player.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'player_reset_score',
      targetType: 'player',
      targetId: player._id.toString(),
      targetName: player.pseudo,
      details: { oldScore }
    });

    res.json({ message: 'Score réinitialisé avec succès' });
  } catch (error) {
    console.error('Error resetting score:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du score' });
  }
});

module.exports = router;