const express = require('express');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  getAccountSettings,
  updateAccountSettings,
  updateAccountAvatar,
  updateAccountCover,
  getNotificationSettings,
  updateNotificationSettings,
  getPrivacySettings,
  updatePrivacySettings,
  getHelpSupport,
  createSupportTicket,
  getAbout,
  getLuzonGardens,
  getPhilippinesFarms,
  getHomeHeroMedia,
} = require('../controllers/settingsController');

const router = express.Router();

router.use(protect);

router.route('/account')
  .get(getAccountSettings)
  .put(updateAccountSettings);
router.put('/account/avatar', upload.single('avatar'), updateAccountAvatar);
router.put('/account/cover', upload.single('cover'), updateAccountCover);

router.route('/notifications')
  .get(getNotificationSettings)
  .put(updateNotificationSettings);

router.route('/privacy')
  .get(getPrivacySettings)
  .put(updatePrivacySettings);

router.route('/help')
  .get(getHelpSupport)
  .post(upload.single('image'), createSupportTicket);

router.get('/about', getAbout);
router.get('/luzon-gardens', getLuzonGardens);
router.get('/philippines-farms', getPhilippinesFarms);
router.get('/home-hero-media', getHomeHeroMedia);

module.exports = router;
