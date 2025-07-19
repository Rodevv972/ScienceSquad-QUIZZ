const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Endpoint GET /api/leaderboard/top100
// Renvoie le classement général TOP 100
router.get('/top100', async (req, res) => {
  try {
    const topPlayers = await User.find({})
      .sort({ total_score: -1 })
      .limit(100)
      .select('player_name avatar total_score games_played victories fastest_answer avg_answer_time last_played');
    res.json(topPlayers);
  } catch (err) {
    console.error('Erreur leaderboard:', err);
    res.status(500).json({ error: 'Erreur serveur leaderboard' });
  }
});

module.exports = router;