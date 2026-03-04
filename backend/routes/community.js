const express = require('express');
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const { messageLimiter } = require('../middlewares/rateLimiter');
const {
  listPosts,
  createPost,
  deletePost,
  toggleLike,
  listPostLikes,
  listCommentLikes,
  createComment,
  replyToComment,
  toggleCommentLike,
  updateComment,
  deleteComment,
  getPublicProfile,
  getThreads,
  searchUsers,
  getThreadMessages,
  sendMessage,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createSystemNotification,
} = require('../controllers/communityController');

const router = express.Router();

router.get('/profiles/:userId', getPublicProfile);

router.use(protect);

router.route('/posts').get(listPosts).post(upload.mediaUpload.single('media'), createPost);
router.delete('/posts/:postId', deletePost);
router.post('/posts/:postId/like', toggleLike);
router.get('/posts/:postId/likes', listPostLikes);
router.post('/posts/:postId/comments', createComment);
router.post('/posts/:postId/comments/:commentId/replies', replyToComment);
router.post('/posts/:postId/comments/:commentId/like', toggleCommentLike);
router.get('/posts/:postId/comments/:commentId/likes', listCommentLikes);
router.put('/posts/:postId/comments/:commentId', updateComment);
router.delete('/posts/:postId/comments/:commentId', deleteComment);

router.get('/messages/threads', getThreads);
router.get('/messages/users', searchUsers);
router.get('/messages/:userId', getThreadMessages);
router.post('/messages/:userId', messageLimiter, sendMessage);

router.get('/notifications', listNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:notificationId/read', markNotificationRead);
router.post('/notifications/system', createSystemNotification);

module.exports = router;
