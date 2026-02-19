const express = require('express');
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const { messageLimiter } = require('../middlewares/rateLimiter');
const {
  listPosts,
  createPost,
  deletePost,
  toggleLike,
  createComment,
  updateComment,
  deleteComment,
  getPublicProfile,
  getThreads,
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
router.post('/posts/:postId/comments', createComment);
router.put('/posts/:postId/comments/:commentId', updateComment);
router.delete('/posts/:postId/comments/:commentId', deleteComment);

router.get('/messages/threads', getThreads);
router.get('/messages/:userId', getThreadMessages);
router.post('/messages/:userId', messageLimiter, sendMessage);

router.get('/notifications', listNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:notificationId/read', markNotificationRead);
router.post('/notifications/system', createSystemNotification);

module.exports = router;
