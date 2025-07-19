const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  player_name: { type: String, unique: true, required: true },
  avatar: { type: String },
  total_score: { type: Number, default: 0 },
  games_played: { type: Number, default: 0 },
  victories: { type: Number, default: 0 },
  correct_answers: { type: Number, default: 0 },
  wrong_answers: { type: Number, default: 0 },
  fastest_answer: { type: Number, default: 0 },     // en secondes
  avg_answer_time: { type: Number, default: 0 },    // en secondes
  last_played: { type: Date },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);