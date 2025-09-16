const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxlength: 500
  },
  choices: [{
    type: String,
    required: true,
    maxlength: 200
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    default: 'Science'
  },
  subcategory: {
    type: String,
    default: 'General'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  timeLimit: {
    type: Number,
    default: 15,
    min: 5,
    max: 60
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  createdBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    correctAnswerRate: {
      type: Number,
      default: 0
    },
    averageAnswerTime: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index pour les performances et recherches
questionSchema.index({ category: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ 'usage.timesUsed': -1 });
questionSchema.index({ 'usage.correctAnswerRate': 1 });

module.exports = mongoose.model('Question', questionSchema);