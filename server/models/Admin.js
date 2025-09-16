const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Enhanced admin fields
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  },
  permissions: {
    manageGames: {
      type: Boolean,
      default: true
    },
    managePlayers: {
      type: Boolean,
      default: true
    },
    manageQuestions: {
      type: Boolean,
      default: true
    },
    manageAdmins: {
      type: Boolean,
      default: false
    },
    viewStatistics: {
      type: Boolean,
      default: true
    },
    systemMaintenance: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: String,
    default: null
  },
  actionCount: {
    type: Number,
    default: 0
  },
  lastActionAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);