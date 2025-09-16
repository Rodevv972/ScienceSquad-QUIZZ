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
  },
  // Admin management fields
  isBanned: {
    type: Boolean,
    default: false
  },
  banExpiresAt: {
    type: Date,
    default: null
  },
  warnings: {
    type: Number,
    default: 0
  },
  gameHistory: [{
    gameId: String,
    date: Date,
    score: Number,
    position: Number,
    questionsAnswered: Number,
    correctAnswers: Number
  }],
  statistics: {
    averageScore: {
      type: Number,
      default: 0
    },
    bestScore: {
      type: Number,
      default: 0
    },
    totalCorrectAnswers: {
      type: Number,
      default: 0
    },
    totalQuestionsAnswered: {
      type: Number,
      default: 0
    },
    averageAnswerTime: {
      type: Number,
      default: 0
    },
    favoriteCategory: {
      type: String,
      default: null
    }
  },
  notifications: [{
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  }]
}, {
  timestamps: true
});

// Index pour les performances
playerSchema.index({ totalScore: -1 });
playerSchema.index({ pseudo: 1 });

module.exports = mongoose.model('Player', playerSchema);