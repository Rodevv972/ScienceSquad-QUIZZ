const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['personal', 'global', 'warning', 'info', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  sender: {
    type: String,
    required: true
  },
  recipients: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    pseudo: String,
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  }],
  isGlobal: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour les performances
notificationSchema.index({ type: 1 });
notificationSchema.index({ isGlobal: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'recipients.playerId': 1 });

module.exports = mongoose.model('Notification', notificationSchema);