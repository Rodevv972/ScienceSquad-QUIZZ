const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  choices: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    required: true
  },
  timeLimit: {
    type: Number,
    default: 15
  }
});

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  questions: [questionSchema],
  players: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    pseudo: String,
    avatar: String,
    score: {
      type: Number,
      default: 0
    },
    answers: [{
      questionIndex: Number,
      answer: Number,
      timeToAnswer: Number,
      isCorrect: Boolean,
      timestamp: Date
    }],
    isConnected: {
      type: Boolean,
      default: true
    }
  }],
  adminId: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  questionStartTime: {
    type: Date,
    default: null
  },
  maxPlayers: {
    type: Number,
    default: 50
  }
}, {
  timestamps: true
});

// Index pour les performances
gameSchema.index({ gameId: 1 });
gameSchema.index({ status: 1 });

module.exports = mongoose.model('Game', gameSchema);