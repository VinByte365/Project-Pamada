const express = require('express');
const {
  createScan,
  getScans,
  getScan,
  updateScan,
  deleteScan,
  getScansByPlant,
  getMlHealth,
  liveDetect,
  analyzePreview,
  confirmPreview,
  verifyAloeDebug,
  getScanRecommendations,
  updateScanRecommendationCompletion,
} = require('../controllers/scanController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { scanLimiter, liveDetectionLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getScans)
  .post(scanLimiter, upload.single('image'), createScan);

router.get('/ml-health', getMlHealth);
router.post('/live-detect', liveDetectionLimiter, upload.single('image'), liveDetect);
router.post('/analyze-preview', scanLimiter, upload.single('image'), analyzePreview);
router.post('/confirm-preview', scanLimiter, confirmPreview);
router.post('/verify-aloe-debug', scanLimiter, upload.single('image'), verifyAloeDebug);
router.get('/:id/recommendations', getScanRecommendations);
router.patch('/:id/recommendations/:recommendationId', updateScanRecommendationCompletion);

router.route('/plant/:plantId')
  .get(getScansByPlant);

router.route('/:id')
  .get(getScan)
  .put(updateScan)
  .delete(deleteScan);

module.exports = router;

