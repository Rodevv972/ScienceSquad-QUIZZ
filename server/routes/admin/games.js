const express = require('express');
const router = express.Router();
const Game = require('../../models/Game');
const AdminLog = require('../../models/AdminLog');
const { authenticateAdmin } = require('../../middleware/auth');

// Middleware to authenticate admin
router.use(authenticateAdmin);

// Get all games with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all', // all, waiting, active, finished
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const games = await Game
      .find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('gameId status createdBy players.length currentQuestion createdAt endedAt statistics');

    const total = await Game.countDocuments(query);

    // Add player count to each game
    const gamesWithPlayerCount = games.map(game => ({
      ...game.toObject(),
      playerCount: game.players ? game.players.length : 0
    }));

    res.json({
      games: gamesWithPlayerCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des parties' });
  }
});

// Get game details
router.get('/:gameId', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    res.json(game);
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la partie' });
  }
});

// Delete a game
router.delete('/:gameId', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Can only delete waiting or finished games
    if (game.status === 'active') {
      return res.status(400).json({ message: 'Impossible de supprimer une partie en cours' });
    }

    await Game.deleteOne({ gameId: req.params.gameId });

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'game_delete',
      targetType: 'game',
      targetId: game.gameId,
      targetName: `Game ${game.gameId}`,
      details: { 
        status: game.status,
        playerCount: game.players.length,
        createdBy: game.createdBy
      }
    });

    res.json({ message: 'Partie supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la partie' });
  }
});

// Modify game settings
router.put('/:gameId/settings', async (req, res) => {
  try {
    const { questionCount, timePerQuestion, difficulty, categories, maxPlayers } = req.body;
    
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    // Can only modify waiting games
    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Impossible de modifier une partie en cours ou terminée' });
    }

    const oldSettings = { ...game.settings };

    // Update settings
    if (questionCount !== undefined) game.settings.questionCount = questionCount;
    if (timePerQuestion !== undefined) game.settings.timePerQuestion = timePerQuestion;
    if (difficulty !== undefined) game.settings.difficulty = difficulty;
    if (categories !== undefined) game.settings.categories = categories;
    if (maxPlayers !== undefined) game.maxPlayers = maxPlayers;

    await game.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'game_modify',
      targetType: 'game',
      targetId: game.gameId,
      targetName: `Game ${game.gameId}`,
      details: { 
        oldSettings,
        newSettings: game.settings
      }
    });

    res.json({ message: 'Paramètres de la partie modifiés avec succès', game });
  } catch (error) {
    console.error('Error modifying game:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la partie' });
  }
});

// End a game forcefully
router.post('/:gameId/end', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    if (game.status === 'finished') {
      return res.status(400).json({ message: 'La partie est déjà terminée' });
    }

    game.status = 'finished';
    game.endedAt = new Date();
    game.endReason = 'admin_ended';
    await game.save();

    // Log action
    await AdminLog.create({
      adminUsername: req.admin.username,
      action: 'game_end',
      targetType: 'game',
      targetId: game.gameId,
      targetName: `Game ${game.gameId}`,
      details: { 
        reason: 'admin_ended',
        playerCount: game.players.length,
        questionsPlayed: game.currentQuestion
      }
    });

    res.json({ message: 'Partie terminée avec succès' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ message: 'Erreur lors de la fin de partie' });
  }
});

// Get game history with detailed statistics
router.get('/history/detailed', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const query = { status: 'finished' };
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const games = await Game
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('gameId createdBy players questions createdAt endedAt statistics');

    const total = await Game.countDocuments(query);

    // Calculate detailed statistics for each game
    const detailedGames = games.map(game => {
      const playerStats = game.players.map(player => ({
        pseudo: player.pseudo,
        score: player.score,
        correctAnswers: player.answers.filter(a => a.isCorrect).length,
        totalAnswers: player.answers.length,
        averageTime: player.answers.length > 0 
          ? player.answers.reduce((sum, a) => sum + a.timeToAnswer, 0) / player.answers.length 
          : 0
      }));

      return {
        gameId: game.gameId,
        createdBy: game.createdBy,
        createdAt: game.createdAt,
        endedAt: game.endedAt,
        duration: game.endedAt ? game.endedAt - game.createdAt : null,
        totalQuestions: game.questions.length,
        playerCount: game.players.length,
        averageScore: playerStats.length > 0 
          ? playerStats.reduce((sum, p) => sum + p.score, 0) / playerStats.length 
          : 0,
        topScore: playerStats.length > 0 
          ? Math.max(...playerStats.map(p => p.score)) 
          : 0,
        playerStats
      };
    });

    res.json({
      games: detailedGames,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching detailed game history:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique détaillé' });
  }
});

module.exports = router;