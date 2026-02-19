const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'grower'],
    default: 'grower'
  },
  phone: {
    type: String
  },
  profile_image: {
    url: {
      type: String,
      default: ''
    },
    public_id: {
      type: String,
      default: ''
    }
  },
  preferences: {
    notification_enabled: {
      type: Boolean,
      default: true
    },
    push_notifications: {
      type: Boolean,
      default: true
    },
    email_notifications: {
      type: Boolean,
      default: true
    },
    disease_alert_notifications: {
      type: Boolean,
      default: true
    },
    scan_reminder_notifications: {
      type: Boolean,
      default: true
    },
    weekly_report_notifications: {
      type: Boolean,
      default: false
    },
    login_alerts: {
      type: Boolean,
      default: true
    },
    data_sharing_consent: {
      type: Boolean,
      default: false
    },
    profile_visibility: {
      type: String,
      enum: ['private', 'team'],
      default: 'private'
    },
    two_factor_enabled: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'en'
    },
    location: String,
    farm_size: String
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password_hash')) return;
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = mongoose.model('User', userSchema);
