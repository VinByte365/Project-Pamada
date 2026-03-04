const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticket_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  mobile_unit: {
    type: String,
    required: true,
    trim: true,
  },
  os_version: {
    type: String,
    required: true,
    trim: true,
  },
  issue_category: {
    type: String,
    enum: [
      'detection_error',
      'maturity_misclassification',
      'disease_misclassification',
      'app_crash',
      'performance_issue',
      'other',
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  issue_image: {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    public_id: {
      type: String,
      required: true,
      trim: true,
    },
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open'
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ user_id: 1, createdAt: -1 });
supportTicketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
