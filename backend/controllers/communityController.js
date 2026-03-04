const mongoose = require('mongoose');
const fs = require('fs/promises');
const asyncHandler = require('../utils/controllerWrapper');
const User = require('../models/user');
const CommunityPost = require('../models/communityPost');
const CommunityComment = require('../models/communityComment');
const CommunityLike = require('../models/communityLike');
const CommunityCommentLike = require('../models/communityCommentLike');
const Message = require('../models/message');
const Notification = require('../models/notification');
const { emitToUser, getIO } = require('../socket');
const { uploadMedia, uploadMediaFromPath, deleteMedia } = require('../services/imageService');

const BLOCKED_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'motherfucker',
  'puta',
  'putangina',
  'gago',
  'ulol',
];

const containsBlockedWord = (text = '') => {
  const normalized = String(text).toLowerCase();
  return BLOCKED_WORDS.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    return pattern.test(normalized);
  });
};

const toUserSummary = (user) => ({
  id: user?._id || user?.id,
  full_name: user?.full_name || 'Unknown',
  profile_image_url: user?.profile_image?.url || '',
  cover_image_url: user?.cover_image?.url || '',
});

const canSendNotification = (preferences = {}, type) => {
  if (preferences.notification_enabled === false) return false;

  if (type === 'harvest_alert' || type === 'health_alert') {
    return preferences.disease_alert_notifications !== false;
  }

  if (type === 'system_announcement') {
    return preferences.weekly_report_notifications !== false || preferences.push_notifications !== false;
  }

  return preferences.push_notifications !== false;
};

const createNotification = async ({ userId, type, referenceId, message }) => {
  if (!userId) return null;
  const recipient = await User.findById(userId).select('preferences');
  if (!recipient) return null;
  if (!canSendNotification(recipient.preferences || {}, type)) return null;

  const notification = await Notification.create({
    user_id: userId,
    type,
    reference_id: referenceId ? String(referenceId) : '',
    message,
  });

  emitToUser(String(userId), 'notification:new', {
    id: notification._id,
    type: notification.type,
    reference_id: notification.reference_id,
    message: notification.message,
    is_read: notification.is_read,
    created_at: notification.createdAt,
  });

  return notification;
};

const toIdString = (value) => (value ? String(value) : null);

const resolveTopLevelParentId = (commentId, parentMap, memo = new Map(), visiting = new Set()) => {
  const key = toIdString(commentId);
  if (!key) return null;
  if (memo.has(key)) return memo.get(key);
  if (visiting.has(key)) return parentMap.get(key) || null;

  visiting.add(key);
  const directParentId = parentMap.get(key) || null;
  if (!directParentId) {
    memo.set(key, null);
    visiting.delete(key);
    return null;
  }

  const ancestor = resolveTopLevelParentId(directParentId, parentMap, memo, visiting);
  const topLevelParentId = ancestor || directParentId;
  memo.set(key, topLevelParentId);
  visiting.delete(key);
  return topLevelParentId;
};

const collectCommentSubtreeIds = async (postId, rootCommentId) => {
  const seen = new Set();
  const allIds = [];
  let frontier = [toIdString(rootCommentId)].filter(Boolean);

  while (frontier.length > 0) {
    const fresh = frontier.filter((id) => !seen.has(id));
    if (!fresh.length) break;

    fresh.forEach((id) => {
      seen.add(id);
      allIds.push(id);
    });

    const children = await CommunityComment.find({
      post_id: postId,
      parent_comment_id: { $in: fresh },
    }).select('_id');

    frontier = children.map((item) => toIdString(item._id)).filter((id) => id && !seen.has(id));
  }

  return allIds;
};

const enrichPosts = async (posts, viewerId) => {
  const postIds = posts.map((post) => post._id);

  const [likes, comments, commentLikes] = await Promise.all([
    CommunityLike.find({ post_id: { $in: postIds } }).select('post_id user_id'),
    CommunityComment.find({ post_id: { $in: postIds } })
      .sort({ createdAt: 1 })
      .populate('user_id', 'full_name profile_image'),
    CommunityCommentLike.find({ post_id: { $in: postIds } }).select('comment_id user_id'),
  ]);

  const likeMap = new Map();
  const viewerLikeSet = new Set();
  likes.forEach((like) => {
    const postId = like.post_id.toString();
    likeMap.set(postId, (likeMap.get(postId) || 0) + 1);
    if (viewerId && like.user_id.toString() === String(viewerId)) {
      viewerLikeSet.add(postId);
    }
  });

  const commentLikeCountMap = new Map();
  const viewerCommentLikeSet = new Set();
  commentLikes.forEach((like) => {
    const commentId = String(like.comment_id);
    commentLikeCountMap.set(commentId, (commentLikeCountMap.get(commentId) || 0) + 1);
    if (viewerId && String(like.user_id) === String(viewerId)) {
      viewerCommentLikeSet.add(commentId);
    }
  });

  const commentMap = new Map();
  const parentMap = new Map();
  comments.forEach((comment) => {
    const commentId = toIdString(comment._id);
    const directParentId = toIdString(comment.parent_comment_id);
    parentMap.set(commentId, directParentId);
    commentMap.set(commentId, {
      id: commentId,
      post_id: toIdString(comment.post_id),
      parent_comment_id: directParentId,
      user_id: toIdString(comment.user_id?._id || comment.user_id),
      user: toUserSummary(comment.user_id),
      content: comment.content,
      created_at: comment.createdAt,
      likes_count: commentLikeCountMap.get(commentId) || 0,
      is_liked: viewerCommentLikeSet.has(commentId),
      replies: [],
    });
  });

  const postCommentMap = new Map();
  const topLevelParentMemo = new Map();
  comments.forEach((comment) => {
    const postId = toIdString(comment.post_id);
    if (!postCommentMap.has(postId)) postCommentMap.set(postId, []);
    const commentId = toIdString(comment._id);
    const normalized = commentMap.get(commentId);
    if (normalized.parent_comment_id) {
      const topLevelParentId = resolveTopLevelParentId(commentId, parentMap, topLevelParentMemo);
      normalized.reply_to_comment_id = normalized.parent_comment_id;
      normalized.parent_comment_id = topLevelParentId || normalized.parent_comment_id;
      const parent = commentMap.get(toIdString(normalized.parent_comment_id));
      if (parent) {
        parent.replies.push(normalized);
      } else {
        postCommentMap.get(postId).push(normalized);
      }
    } else {
      postCommentMap.get(postId).push(normalized);
    }
  });

  return posts.map((post) => {
    const postId = post._id.toString();
    const postComments = postCommentMap.get(postId) || [];
    return {
      id: post._id,
      user: toUserSummary(post.user_id),
      content: post.content,
      media_url: post.media_url || '',
      media_type: post.media_type || '',
      created_at: post.createdAt,
      is_owner: String(post.user_id?._id || post.user_id) === String(viewerId),
      likes_count: likeMap.get(postId) || 0,
      comments_count: comments.filter((item) => String(item.post_id) === postId).length,
      is_liked: viewerLikeSet.has(postId),
      comments: postComments,
    };
  });
};

exports.listPosts = asyncHandler(async (req, res) => {
  const posts = await CommunityPost.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user_id', 'full_name profile_image');

  const enriched = await enrichPosts(posts, req.user.id);

  res.status(200).json({
    success: true,
    data: { posts: enriched },
  });
});

exports.createPost = asyncHandler(async (req, res) => {
  const content = String(req.body.content || '').trim();
  const media_url_input = String(req.body.media_url || '').trim();

  if (!content && !req.file && !media_url_input) {
    return res.status(400).json({ success: false, error: 'Post content or media is required' });
  }

  if (containsBlockedWord(content)) {
    return res.status(400).json({ success: false, error: 'Caption contains inappropriate language' });
  }

  let media_url = media_url_input;
  let media_type = '';
  let media_public_id = '';

  if (req.file?.buffer) {
    const isVideo = String(req.file.mimetype || '').startsWith('video/');
    const uploaded = await uploadMedia(req.file.buffer, 'pamada-community', {
      resource_type: isVideo ? 'video' : 'image',
      timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '600000', 10),
    });
    media_url = uploaded?.secure_url || '';
    media_type = uploaded?.resource_type === 'video' ? 'video' : 'image';
    media_public_id = uploaded?.public_id || '';
  } else if (req.file?.path) {
    const isVideo = String(req.file.mimetype || '').startsWith('video/');
    try {
      const uploaded = await uploadMediaFromPath(req.file.path, 'pamada-community', {
        resource_type: isVideo ? 'video' : 'image',
        timeout: parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '600000', 10),
      });
      media_url = uploaded?.secure_url || '';
      media_type = uploaded?.resource_type === 'video' ? 'video' : 'image';
      media_public_id = uploaded?.public_id || '';
    } finally {
      await fs.unlink(req.file.path).catch(() => null);
    }
  } else if (media_url_input) {
    media_type = /\.(mp4|mov|webm|m4v|avi)$/i.test(media_url_input) ? 'video' : 'image';
  }

  const post = await CommunityPost.create({
    user_id: req.user.id,
    content,
    media_url,
    media_type,
    media_public_id,
  });

  const fullPost = await CommunityPost.findById(post._id).populate('user_id', 'full_name profile_image');
  const [enriched] = await enrichPosts([fullPost], req.user.id);

  getIO()?.emit('community:post_created', enriched);

  res.status(201).json({
    success: true,
    data: { post: enriched },
  });
});

exports.deletePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  if (String(post.user_id) !== String(req.user.id)) {
    return res.status(403).json({ success: false, error: 'You can only delete your own posts' });
  }

  await Promise.all([
    CommunityComment.deleteMany({ post_id: post._id }),
    CommunityLike.deleteMany({ post_id: post._id }),
    CommunityCommentLike.deleteMany({ post_id: post._id }),
    post.media_public_id
      ? deleteMedia(post.media_public_id, post.media_type === 'video' ? 'video' : 'image').catch(() => null)
      : Promise.resolve(),
    post.deleteOne(),
  ]);

  getIO()?.emit('community:post_deleted', { postId: String(post._id) });

  res.status(200).json({ success: true, message: 'Post deleted' });
});

exports.toggleLike = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.postId).populate('user_id', 'full_name profile_image');
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const existing = await CommunityLike.findOne({
    post_id: post._id,
    user_id: req.user.id,
  });

  let liked = false;
  if (existing) {
    await existing.deleteOne();
  } else {
    await CommunityLike.create({ post_id: post._id, user_id: req.user.id });
    liked = true;

    if (String(post.user_id._id) !== String(req.user.id)) {
      await createNotification({
        userId: post.user_id._id,
        type: 'post_liked',
        referenceId: post._id,
        message: `${req.user.full_name} liked your post.`,
      });
    }
  }

  const likesCount = await CommunityLike.countDocuments({ post_id: post._id });
  const commentsCount = await CommunityComment.countDocuments({ post_id: post._id });

  getIO()?.emit('community:post_updated', {
    postId: String(post._id),
    likes_count: likesCount,
    comments_count: commentsCount,
  });

  res.status(200).json({
    success: true,
    data: {
      liked,
      likes_count: likesCount,
      comments_count: commentsCount,
    },
  });
});

exports.listPostLikes = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const likes = await CommunityLike.find({ post_id: post._id })
    .sort({ createdAt: -1 })
    .populate('user_id', 'full_name profile_image');

  res.status(200).json({
    success: true,
    data: {
      users: likes.map((entry) => toUserSummary(entry.user_id)),
      count: likes.length,
    },
  });
});

exports.listCommentLikes = asyncHandler(async (req, res) => {
  const comment = await CommunityComment.findOne({
    _id: req.params.commentId,
    post_id: req.params.postId,
  });
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const likes = await CommunityCommentLike.find({ comment_id: comment._id })
    .sort({ createdAt: -1 })
    .populate('user_id', 'full_name profile_image');

  res.status(200).json({
    success: true,
    data: {
      users: likes.map((entry) => toUserSummary(entry.user_id)),
      count: likes.length,
    },
  });
});

exports.createComment = asyncHandler(async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ success: false, error: 'Comment content is required' });
  }
  if (containsBlockedWord(content)) {
    return res.status(400).json({ success: false, error: 'Comment contains inappropriate language' });
  }

  const post = await CommunityPost.findById(req.params.postId).populate('user_id', 'full_name profile_image');
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const comment = await CommunityComment.create({
    post_id: post._id,
    user_id: req.user.id,
    content,
    parent_comment_id: null,
  });

  const fullComment = await CommunityComment.findById(comment._id).populate('user_id', 'full_name profile_image');

  const payload = {
    id: fullComment._id,
    post_id: fullComment.post_id,
    user_id: fullComment.user_id?._id || fullComment.user_id,
    user: toUserSummary(fullComment.user_id),
    content: fullComment.content,
    created_at: fullComment.createdAt,
    likes_count: 0,
    is_liked: false,
    replies: [],
  };

  if (String(post.user_id._id) !== String(req.user.id)) {
    await createNotification({
      userId: post.user_id._id,
      type: 'post_commented',
      referenceId: post._id,
      message: `${req.user.full_name} commented on your post.`,
    });
  }

  const likesCount = await CommunityLike.countDocuments({ post_id: post._id });
  const commentsCount = await CommunityComment.countDocuments({ post_id: post._id });

  getIO()?.emit('community:comment_created', payload);
  getIO()?.emit('community:post_updated', {
    postId: String(post._id),
    likes_count: likesCount,
    comments_count: commentsCount,
  });

  res.status(201).json({
    success: true,
    data: {
      comment: payload,
      likes_count: likesCount,
      comments_count: commentsCount,
    },
  });
});

exports.updateComment = asyncHandler(async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ success: false, error: 'Comment content is required' });
  }
  if (containsBlockedWord(content)) {
    return res.status(400).json({ success: false, error: 'Comment contains inappropriate language' });
  }

  const post = await CommunityPost.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const comment = await CommunityComment.findOne({
    _id: req.params.commentId,
    post_id: req.params.postId,
  }).populate('user_id', 'full_name profile_image');

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  if (String(comment.user_id?._id || comment.user_id) !== String(req.user.id)) {
    return res.status(403).json({ success: false, error: 'You can only edit your own comment' });
  }

  comment.content = content;
  await comment.save();

  const payload = {
    id: comment._id,
    post_id: comment.post_id,
    user_id: comment.user_id?._id || comment.user_id,
    user: toUserSummary(comment.user_id),
    content: comment.content,
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
    likes_count: await CommunityCommentLike.countDocuments({ comment_id: comment._id }),
    is_liked: false,
    replies: [],
  };

  getIO()?.emit('community:comment_updated', payload);

  res.status(200).json({
    success: true,
    data: { comment: payload },
  });
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const comment = await CommunityComment.findOne({
    _id: req.params.commentId,
    post_id: req.params.postId,
  });

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const isCommentOwner = String(comment.user_id) === String(req.user.id);
  const isPostOwner = String(post.user_id) === String(req.user.id);
  if (!isCommentOwner && !isPostOwner) {
    return res.status(403).json({ success: false, error: 'Not allowed to delete this comment' });
  }

  const commentIdsToDelete = await collectCommentSubtreeIds(req.params.postId, comment._id);
  await CommunityCommentLike.deleteMany({
    post_id: req.params.postId,
    comment_id: { $in: commentIdsToDelete },
  });
  await CommunityComment.deleteMany({
    _id: { $in: commentIdsToDelete },
  });

  const likesCount = await CommunityLike.countDocuments({ post_id: post._id });
  const commentsCount = await CommunityComment.countDocuments({ post_id: post._id });

  commentIdsToDelete.forEach((commentId) => {
    getIO()?.emit('community:comment_deleted', {
      post_id: String(post._id),
      comment_id: String(commentId),
    });
  });
  getIO()?.emit('community:post_updated', {
    postId: String(post._id),
    likes_count: likesCount,
    comments_count: commentsCount,
  });

  res.status(200).json({ success: true, message: 'Comment deleted' });
});

exports.replyToComment = asyncHandler(async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ success: false, error: 'Reply content is required' });
  }
  if (containsBlockedWord(content)) {
    return res.status(400).json({ success: false, error: 'Reply contains inappropriate language' });
  }

  const post = await CommunityPost.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post not found' });
  }

  const parentComment = await CommunityComment.findOne({
    _id: req.params.commentId,
    post_id: req.params.postId,
  }).populate('user_id', 'full_name profile_image');

  if (!parentComment) {
    return res.status(404).json({ success: false, error: 'Parent comment not found' });
  }

  const reply = await CommunityComment.create({
    post_id: req.params.postId,
    parent_comment_id: parentComment._id,
    user_id: req.user.id,
    content,
  });
  const fullReply = await CommunityComment.findById(reply._id).populate('user_id', 'full_name profile_image');
  const fullParentChain = await CommunityComment.find({ post_id: req.params.postId }).select('_id parent_comment_id');
  const parentMap = new Map();
  fullParentChain.forEach((item) => {
    parentMap.set(toIdString(item._id), toIdString(item.parent_comment_id));
  });
  const topLevelParentId =
    resolveTopLevelParentId(toIdString(parentComment._id), parentMap) || toIdString(parentComment._id);

  const payload = {
    id: toIdString(fullReply._id),
    post_id: toIdString(fullReply.post_id),
    parent_comment_id: topLevelParentId,
    reply_to_comment_id: toIdString(fullReply.parent_comment_id),
    user_id: toIdString(fullReply.user_id?._id || fullReply.user_id),
    user: toUserSummary(fullReply.user_id),
    content: fullReply.content,
    created_at: fullReply.createdAt,
    likes_count: 0,
    is_liked: false,
    replies: [],
  };

  const likesCount = await CommunityLike.countDocuments({ post_id: post._id });
  const commentsCount = await CommunityComment.countDocuments({ post_id: post._id });
  getIO()?.emit('community:comment_created', payload);
  getIO()?.emit('community:post_updated', {
    postId: String(post._id),
    likes_count: likesCount,
    comments_count: commentsCount,
  });

  res.status(201).json({
    success: true,
    data: { comment: payload },
  });
});

exports.toggleCommentLike = asyncHandler(async (req, res) => {
  const comment = await CommunityComment.findOne({
    _id: req.params.commentId,
    post_id: req.params.postId,
  });

  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  const existing = await CommunityCommentLike.findOne({
    comment_id: comment._id,
    user_id: req.user.id,
  });

  let liked = false;
  if (existing) {
    await existing.deleteOne();
  } else {
    await CommunityCommentLike.create({
      post_id: req.params.postId,
      comment_id: comment._id,
      user_id: req.user.id,
    });
    liked = true;
  }

  const likesCount = await CommunityCommentLike.countDocuments({ comment_id: comment._id });

  res.status(200).json({
    success: true,
    data: {
      liked,
      likes_count: likesCount,
      comment_id: String(comment._id),
    },
  });
});

exports.getPublicProfile = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const user = await User.findById(req.params.userId).select('full_name profile_image cover_image createdAt preferences');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const posts = await CommunityPost.find({ user_id: user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('user_id', 'full_name profile_image');

  const enriched = await enrichPosts(posts, viewerId);

  res.status(200).json({
    success: true,
    data: {
      profile: {
        id: user._id,
        full_name: user.full_name,
        profile_image_url: user.profile_image?.url || '',
        cover_image_url: user.cover_image?.url || '',
        bio: user.preferences?.bio || '',
        created_at: user.createdAt,
      },
      posts: enriched,
    },
  });
});

exports.getThreads = asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const messages = await Message.find({
    $or: [{ sender_id: userId }, { receiver_id: userId }],
  })
    .sort({ createdAt: -1 })
    .populate('sender_id receiver_id', 'full_name profile_image');

  const threadMap = new Map();
  messages.forEach((message) => {
    const senderId = String(message.sender_id?._id || message.sender_id);
    const receiverId = String(message.receiver_id?._id || message.receiver_id);
    const counterpart = senderId === userId ? message.receiver_id : message.sender_id;
    const counterpartId = String(counterpart?._id || counterpart);

    if (!threadMap.has(counterpartId)) {
      threadMap.set(counterpartId, {
        user: toUserSummary(counterpart),
        last_message: message.content,
        last_message_at: message.createdAt,
        last_message_sender_id: senderId,
        last_message_read_status: Boolean(message.read_status),
        unread_count: 0,
      });
    }

    if (receiverId === userId && senderId === counterpartId && !message.read_status) {
      const existing = threadMap.get(counterpartId);
      existing.unread_count = (existing.unread_count || 0) + 1;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      threads: Array.from(threadMap.values()).sort(
        (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)
      ),
    },
  });
});

exports.searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(200).json({ success: true, data: { users: [] } });
  }

  const users = await User.find({
    _id: { $ne: req.user.id },
    full_name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  })
    .sort({ full_name: 1 })
    .limit(20)
    .select('full_name profile_image');

  res.status(200).json({
    success: true,
    data: {
      users: users.map((item) => toUserSummary(item)),
    },
  });
});

exports.getThreadMessages = asyncHandler(async (req, res) => {
  const userId = String(req.user.id);
  const otherUserId = String(req.params.userId);

  if (otherUserId === userId) {
    return res.status(400).json({ success: false, error: 'Cannot chat with yourself' });
  }

  if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
    return res.status(400).json({ success: false, error: 'Invalid user id' });
  }

  const otherUser = await User.findById(otherUserId).select('full_name profile_image');
  if (!otherUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  await Message.updateMany(
    { sender_id: otherUserId, receiver_id: userId, read_status: false },
    { $set: { read_status: true } }
  );

  const messages = await Message.find({
    $or: [
      { sender_id: userId, receiver_id: otherUserId },
      { sender_id: otherUserId, receiver_id: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('sender_id receiver_id', 'full_name profile_image');

  res.status(200).json({
    success: true,
    data: {
      user: toUserSummary(otherUser),
      messages: messages.map((message) => ({
        id: message._id,
        sender_id: String(message.sender_id?._id || message.sender_id),
        receiver_id: String(message.receiver_id?._id || message.receiver_id),
        content: message.content,
        read_status: message.read_status,
        created_at: message.createdAt,
      })),
    },
  });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const receiverId = String(req.params.userId);
  const content = String(req.body.content || '').trim();

  if (receiverId === String(req.user.id)) {
    return res.status(400).json({ success: false, error: 'Cannot send a message to yourself' });
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ success: false, error: 'Invalid receiver id' });
  }

  if (!content) {
    return res.status(400).json({ success: false, error: 'Message content is required' });
  }

  const receiver = await User.findById(receiverId).select('full_name profile_image');
  if (!receiver) {
    return res.status(404).json({ success: false, error: 'Receiver not found' });
  }

  const message = await Message.create({
    sender_id: req.user.id,
    receiver_id: receiverId,
    content,
  });

  const payload = {
    id: message._id,
    sender_id: String(req.user.id),
    receiver_id: receiverId,
    content: message.content,
    read_status: false,
    created_at: message.createdAt,
  };

  emitToUser(receiverId, 'message:new', payload);
  emitToUser(String(req.user.id), 'message:new', payload);

  await createNotification({
    userId: receiverId,
    type: 'new_message',
    referenceId: message._id,
    message: `New message from ${req.user.full_name}.`,
  });

  res.status(201).json({ success: true, data: { message: payload } });
});

exports.listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: {
      notifications: notifications.map((notification) => ({
        id: notification._id,
        type: notification.type,
        reference_id: notification.reference_id,
        message: notification.message,
        is_read: notification.is_read,
        created_at: notification.createdAt,
      })),
    },
  });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    user_id: req.user.id,
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }

  notification.is_read = true;
  await notification.save();

  res.status(200).json({ success: true, message: 'Notification marked as read' });
});

exports.markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user_id: req.user.id, is_read: false }, { $set: { is_read: true } });

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

exports.createSystemNotification = asyncHandler(async (req, res) => {
  const { type, message } = req.body;
  if (!type || !message) {
    return res.status(400).json({ success: false, error: 'Type and message are required' });
  }

  const allowed = ['harvest_alert', 'health_alert', 'system_announcement'];
  if (!allowed.includes(type)) {
    return res.status(400).json({ success: false, error: 'Unsupported notification type' });
  }

  await createNotification({
    userId: req.user.id,
    type,
    referenceId: '',
    message,
  });

  res.status(201).json({ success: true, message: 'Notification created' });
});
