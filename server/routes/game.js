const express = require('express');
const Game = require('../models/Game');
const router = express.Router();

// Obtenir les parties disponibles
router.get('/available', async (req, res) => {
  try {
    const games = await Game.find({ status: 'waiting' })
      .select('gameId createdBy players createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const gamesWithCount = games.map(game => ({
      gameId: game.gameId,
      createdBy: game.createdBy,
      playerCount: game.players.length,
      createdAt: game.createdAt
    }));

    res.json(gamesWithCount);
  } catch (error) {
    console.error('Erreur récupération parties:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les détails d'une partie
router.get('/:gameId', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.gameId });
    
    if (!game) {
      return res.status(404).json({ message: 'Partie non trouvée' });
    }

    const gameData = {
      gameId: game.gameId,
      status: game.status,
      createdBy: game.createdBy,
      players: game.players.map(p => ({
        pseudo: p.pseudo,
        avatar: p.avatar,
        score: p.score,
        isConnected: p.isConnected
      })),
      currentQuestion: game.currentQuestion,
      totalQuestions: game.questions.length,
      createdAt: game.createdAt
    };

    res.json(gameData);
  } catch (error) {
    console.error('Erreur récupération partie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir l'historique des parties
router.get('/history/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const games = await Game.find({ status: 'finished' })
      .select('gameId createdBy players createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Game.countDocuments({ status: 'finished' });

    const gamesHistory = games.map(game => ({
      gameId: game.gameId,
      createdBy: game.createdBy,
      playerCount: game.players.length,
      winner: game.players.length > 0 ? 
        game.players.sort((a, b) => b.score - a.score)[0].pseudo : 
        null,
      createdAt: game.createdAt
    }));

    res.json({
      games: gamesHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;