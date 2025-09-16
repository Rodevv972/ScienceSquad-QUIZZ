const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminUsername: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'player_ban', 'player_unban', 'player_reset_score', 'player_send_message',
      'game_create', 'game_delete', 'game_modify', 'game_end',
      'question_add', 'question_edit', 'question_delete', 'question_import',
      'admin_add', 'admin_remove', 'admin_modify_permissions',
      'security_alert', 'maintenance_mode', 'server_announcement'
    ]
  },
  targetType: {
    type: String,
    enum: ['player', 'game', 'question', 'admin', 'system'],
    required: true
  },
  targetId: {
    type: String,
    default: null
  },
  targetName: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index pour les performances et recherches
adminLogSchema.index({ adminUsername: 1 });
adminLogSchema.index({ action: 1 });
adminLogSchema.index({ targetType: 1 });
adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);