const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');

// Endpoint GET /api/liveStats/live
// Renvoie les statistiques live sur les joueurs et la partie
router.get('/live', async (req, res) => {
  try {
    // Nombre de joueurs actifs (ici, tous les joueurs ayant joué dans la dernière heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activePlayers = await User.countDocuments({ last_played: { $gte: oneHourAgo } });

    // Nombre total de parties
    const totalGames = await Game.countDocuments({});

    // Score moyen des parties
    const avgScore = await Game.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" } } }
    ]);

    // Nombre moyen de bonnes/mauvaises réponses par partie
    const avgAnswers = await Game.aggregate([
      { $group: { _id: null, avgCorrect: { $avg: "$correct_answers" }, avgWrong: { $avg: "$wrong_answers" } } }
    ]);

    // Joueur le plus rapide (meilleur fastest_answer)
    const fastestPlayer = await User.findOne({ fastest_answer: { $gt: 0 } })
      .sort({ fastest_answer: 1 })
      .select('player_name avatar fastest_answer');

    res.json({
      activePlayers,
      totalGames,
      avgScore: avgScore[0]?.avgScore || 0,
      avgCorrectAnswers: avgAnswers[0]?.avgCorrect || 0,
      avgWrongAnswers: avgAnswers[0]?.avgWrong || 0,
      fastestPlayer: fastestPlayer || null
    });
  } catch (err) {
    console.error('Erreur stats live:', err);
    res.status(500).json({ error: 'Erreur serveur stats live' });
  }
});

module.exports = router;