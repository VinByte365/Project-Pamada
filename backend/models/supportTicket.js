const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'feedback'],
    default: 'general'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
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

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
