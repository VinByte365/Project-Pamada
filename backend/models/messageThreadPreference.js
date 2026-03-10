const mongoose = require('mongoose');

const messageThreadPreferenceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    counterpart_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    muted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageThreadPreferenceSchema.index({ user_id: 1, counterpart_id: 1 }, { unique: true });

module.exports = mongoose.model('MessageThreadPreference', messageThreadPreferenceSchema);
