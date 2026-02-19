const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    media_url: {
      type: String,
      default: '',
      trim: true,
    },
    media_type: {
      type: String,
      enum: ['', 'image', 'video'],
      default: '',
    },
    media_public_id: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CommunityPost', postSchema);
