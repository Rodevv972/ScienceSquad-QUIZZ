const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  pseudo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  avatar: {
    type: String,
    default: null
  },
  totalScore: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index pour les performances
playerSchema.index({ totalScore: -1 });
playerSchema.index({ pseudo: 1 });

module.exports = mongoose.model('Player', playerSchema);