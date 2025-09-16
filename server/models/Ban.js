const mongoose = require('mongoose');

const banSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  pseudo: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  bannedBy: {
    type: String,
    required: true
  },
  banType: {
    type: String,
    enum: ['temporary', 'permanent'],
    default: 'temporary'
  },
  expiresAt: {
    type: Date,
    default: null // null for permanent bans
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour les performances
banSchema.index({ playerId: 1 });
banSchema.index({ pseudo: 1 });
banSchema.index({ isActive: 1 });
banSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Ban', banSchema);