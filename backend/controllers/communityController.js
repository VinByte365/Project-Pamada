const mongoose = require('mongoose');
const asyncHandler = require('../utils/controllerWrapper');
const User = require('../models/user');
const CommunityPost = require('../models/communityPost');
const CommunityComment = require('../models/communityComment');
const CommunityLike = require('../models/communityLike');
const Message = require('../models/message');
const Notification = require('../models/notification');
const { emitToUser, getIO } = require('../socket');
const { uploadMedia, deleteMedia } = require('../services/imageService');

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
});

const createNotification = async ({ userId, type, referenceId, message }) => {
  if (!userId) return null;

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

const enrichPosts = async (posts, viewerId) => {
  const postIds = posts.map((post) => post._id);

  const [likes, comments] = await Promise.all([
    CommunityLike.find({ post_id: { $in: postIds } }).select('post_id user_id'),
    CommunityComment.find({ post_id: { $in: postIds } })
      .sort({ createdAt: 1 })
      .populate('user_id', 'full_name profile_image'),
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

  const commentMap = new Map();
  comments.forEach((comment) => {
    const postId = comment.post_id.toString();
    if (!commentMap.has(postId)) commentMap.set(postId, []);
    commentMap.get(postId).push({
      id: comment._id,
      post_id: comment.post_id,
      user_id: comment.user_id?._id || comment.user_id,
      user: toUserSummary(comment.user_id),
      content: comment.content,
      created_at: comment.createdAt,
    });
  });

  return posts.map((post) => {
    const postId = post._id.toString();
    const postComments = commentMap.get(postId) || [];
    return {
      id: post._id,
      user: toUserSummary(post.user_id),
      content: post.content,
      media_url: post.media_url || '',
      media_type: post.media_type || '',
      created_at: post.createdAt,
      is_owner: String(post.user_id?._id || post.user_id) === String(viewerId),
      likes_count: likeMap.get(postId) || 0,
      comments_count: postComments.length,
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
    const uploaded = await uploadMedia(req.file.buffer, 'pamada-community');
    media_url = uploaded?.secure_url || '';
    media_type = uploaded?.resource_type === 'video' ? 'video' : 'image';
    media_public_id = uploaded?.public_id || '';
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
  });

  const fullComment = await CommunityComment.findById(comment._id).populate('user_id', 'full_name profile_image');

  const payload = {
    id: fullComment._id,
    post_id: fullComment.post_id,
    user_id: fullComment.user_id?._id || fullComment.user_id,
    user: toUserSummary(fullComment.user_id),
    content: fullComment.content,
    created_at: fullComment.createdAt,
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

  await comment.deleteOne();

  const likesCount = await CommunityLike.countDocuments({ post_id: post._id });
  const commentsCount = await CommunityComment.countDocuments({ post_id: post._id });

  getIO()?.emit('community:comment_deleted', {
    post_id: String(post._id),
    comment_id: String(req.params.commentId),
  });
  getIO()?.emit('community:post_updated', {
    postId: String(post._id),
    likes_count: likesCount,
    comments_count: commentsCount,
  });

  res.status(200).json({ success: true, message: 'Comment deleted' });
});

exports.getPublicProfile = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id || null;
  const user = await User.findById(req.params.userId).select('full_name profile_image createdAt preferences');
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
      });
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

  const messages = await Message.find({
    $or: [
      { sender_id: userId, receiver_id: otherUserId },
      { sender_id: otherUserId, receiver_id: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('sender_id receiver_id', 'full_name profile_image');

  await Message.updateMany(
    { sender_id: otherUserId, receiver_id: userId, read_status: false },
    { $set: { read_status: true } }
  );

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
