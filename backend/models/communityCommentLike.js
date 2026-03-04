const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
      index: true,
    },
    comment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityComment',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commentLikeSchema.index({ comment_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('CommunityCommentLike', commentLikeSchema);
