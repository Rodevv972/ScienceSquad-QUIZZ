const User = require('../models/User');

module.exports = {
  // Récupérer le TOP 100 du leaderboard
  async getTop100(req, res) {
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
  }
};