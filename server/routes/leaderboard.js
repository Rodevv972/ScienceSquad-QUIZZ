const express = require('express');
const Player = require('../models/Player');
const Game = require('../models/Game');
const router = express.Router();

// Leaderboard général (top 100)
router.get('/global', async (req, res) => {
  try {
    const players = await Player.find({ totalScore: { $gt: 0 } })
      .select('pseudo avatar totalScore gamesPlayed lastActive')
      .sort({ totalScore: -1 })
      .limit(100);

    const leaderboard = players.map((player, index) => ({
      rank: index + 1,
      pseudo: player.pseudo,
      avatar: player.avatar,
      totalScore: player.totalScore,
      gamesPlayed: player.gamesPlayed,
      averageScore: player.gamesPlayed > 0 ? 
        Math.round(player.totalScore / player.gamesPlayed) : 0,
      lastActive: player.lastActive
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Erreur récupération leaderboard:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Statistiques d'un joueur spécifique
router.get('/player/:pseudo', async (req, res) => {
  try {
    const player = await Player.findOne({ pseudo: req.params.pseudo });
    
    if (!player) {
      return res.status(404).json({ message: 'Joueur non trouvé' });
    }

    // Calculer le rang du joueur
    const betterPlayers = await Player.countDocuments({ 
      totalScore: { $gt: player.totalScore } 
    });
    const rank = betterPlayers + 1;

    // Récupérer les parties récentes du joueur
    const recentGames = await Game.find({ 
      'players.pseudo': player.pseudo,
      status: 'finished'
    })
    .select('gameId createdAt players')
    .sort({ createdAt: -1 })
    .limit(10);

    const gameHistory = recentGames.map(game => {
      const playerInGame = game.players.find(p => p.pseudo === player.pseudo);
      const playerRank = game.players
        .sort((a, b) => b.score - a.score)
        .findIndex(p => p.pseudo === player.pseudo) + 1;
      
      return {
        gameId: game.gameId,
        score: playerInGame ? playerInGame.score : 0,
        rank: playerRank,
        totalPlayers: game.players.length,
        date: game.createdAt
      };
    });

    res.json({
      player: {
        pseudo: player.pseudo,
        avatar: player.avatar,
        totalScore: player.totalScore,
        gamesPlayed: player.gamesPlayed,
        averageScore: player.gamesPlayed > 0 ? 
          Math.round(player.totalScore / player.gamesPlayed) : 0,
        rank: rank,
        lastActive: player.lastActive
      },
      recentGames: gameHistory
    });

  } catch (error) {
    console.error('Erreur récupération stats joueur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Leaderboard hebdomadaire
router.get('/weekly', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Récupérer les parties de la semaine
    const weeklyGames = await Game.find({
      status: 'finished',
      createdAt: { $gte: oneWeekAgo }
    }).select('players');

    // Calculer les scores hebdomadaires
    const weeklyScores = new Map();
    
    weeklyGames.forEach(game => {
      game.players.forEach(player => {
        if (weeklyScores.has(player.pseudo)) {
          weeklyScores.set(player.pseudo, {
            ...weeklyScores.get(player.pseudo),
            totalScore: weeklyScores.get(player.pseudo).totalScore + player.score,
            gamesPlayed: weeklyScores.get(player.pseudo).gamesPlayed + 1
          });
        } else {
          weeklyScores.set(player.pseudo, {
            pseudo: player.pseudo,
            avatar: player.avatar,
            totalScore: player.score,
            gamesPlayed: 1
          });
        }
      });
    });

    // Convertir en tableau et trier
    const weeklyLeaderboard = Array.from(weeklyScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 50)
      .map((player, index) => ({
        rank: index + 1,
        pseudo: player.pseudo,
        avatar: player.avatar,
        weeklyScore: player.totalScore,
        weeklyGames: player.gamesPlayed,
        averageScore: Math.round(player.totalScore / player.gamesPlayed)
      }));

    res.json(weeklyLeaderboard);
  } catch (error) {
    console.error('Erreur récupération leaderboard hebdomadaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Statistiques générales
router.get('/stats/general', async (req, res) => {
  try {
    const totalPlayers = await Player.countDocuments();
    const activePlayers = await Player.countDocuments({ 
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    const totalGames = await Game.countDocuments({ status: 'finished' });
    const activeGames = await Game.countDocuments({ status: { $in: ['waiting', 'active'] } });

    // Top joueur
    const topPlayer = await Player.findOne({ totalScore: { $gt: 0 } })
      .sort({ totalScore: -1 })
      .select('pseudo totalScore');

    res.json({
      totalPlayers,
      activePlayers,
      totalGames,
      activeGames,
      topPlayer: topPlayer ? {
        pseudo: topPlayer.pseudo,
        score: topPlayer.totalScore
      } : null
    });
  } catch (error) {
    console.error('Erreur récupération stats générales:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;