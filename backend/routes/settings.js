const express = require('express');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  getAccountSettings,
  updateAccountSettings,
  updateAccountAvatar,
  getNotificationSettings,
  updateNotificationSettings,
  getPrivacySettings,
  updatePrivacySettings,
  getHelpSupport,
  createSupportTicket,
  getAbout
} = require('../controllers/settingsController');

const router = express.Router();

router.use(protect);

router.route('/account')
  .get(getAccountSettings)
  .put(updateAccountSettings);
router.put('/account/avatar', upload.single('avatar'), updateAccountAvatar);

router.route('/notifications')
  .get(getNotificationSettings)
  .put(updateNotificationSettings);

router.route('/privacy')
  .get(getPrivacySettings)
  .put(updatePrivacySettings);

router.route('/help')
  .get(getHelpSupport)
  .post(createSupportTicket);

router.get('/about', getAbout);

module.exports = router;
