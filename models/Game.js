const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  player_name: { type: String, required: true },
  score: { type: Number, required: true },
  correct_answers: { type: Number, default: 0 },
  wrong_answers: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },       // Durée de la partie en secondes
  date_played: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);