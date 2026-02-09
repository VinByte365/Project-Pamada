/**
 * Chatbot Routes
 * Endpoints for Aloe Vera chatbot functionality
 */

const express = require('express');
const router = express.Router();
const chatbotService = require('../services/geminiChatbotService');
const locationService = require('../services/aloeLocationService');
const {
  validateAloeVeraTopic,
  logQueryAnalytics,
  chatbotRateLimit,
  sanitizeInput
} = require('../middlewares/chatbotValidation');

// Apply middlewares
router.use(sanitizeInput);
router.use(chatbotRateLimit(10, 60000)); // 10 requests per minute
router.use(validateAloeVeraTopic(0.3)); // 30% confidence threshold
router.use(logQueryAnalytics);

/**
 * POST /api/chatbot/ask
 * Send a message to Aloe Vera chatbot
 * 
 * Request body:
 * {
 *   "message": "How do I grow Aloe Vera?",
 *   "userId": "optional-user-id"
 * }
 * 
 * Response:
 * {
 *   "success": true/false,
 *   "message": "Chatbot response",
 *   "confidence": 0.85,
 *   "detectedLocation": null,
 *   "matchedCategories": { "cultivation": 2 },
 *   "isOffTopic": false,
 *   "processingTime": 1200,
 *   "timestamp": "2026-02-04T12:34:56.000Z"
 * }
 */
router.post('/ask', async (req, res, next) => {
  try {
    const { message, userId } = req.body;
    const confidenceThreshold = req.query.confidence || 0.3;

    // Get response from chatbot service
    const response = await chatbotService.chat(
      message,
      userId || `user_${Date.now()}`,
      parseFloat(confidenceThreshold)
    );

    // Log successful request
    console.log('[CHATBOT_REQUEST]', {
      userId: userId || 'anonymous',
      success: response.success,
      confidence: response.confidence,
      isOffTopic: response.isOffTopic,
      processingTime: response.processingTime
    });

    res.json(response);

  } catch (error) {
    console.error('[CHATBOT_ERROR]', error);
    next(error);
  }
});

/**
 * GET /api/chatbot/locations
 * Get information about Aloe Vera farms
 * 
 * Query parameters:
 * - search: Search by farm name, city, or country
 * - country: Filter by country
 * - climate: Filter by climate type
 * - limit: Number of results (default: 5)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "name": "Texas Aloe Farm",
 *       "region": "South Texas, USA",
 *       ...
 *     }
 *   ],
 *   "count": 1
 * }
 */
router.get('/locations', (req, res) => {
  try {
    const { search, country, climate, limit = 5 } = req.query;
    let farms = [];

    if (search) {
      farms = locationService.searchFarmsByLocation(search);
    } else if (country) {
      farms = locationService.getFarmsByCountry(country);
    } else if (climate) {
      farms = locationService.getFarmsByClimate(climate);
    } else {
      farms = locationService.getTopSuitableFarms(parseInt(limit));
    }

    res.json({
      success: true,
      data: farms.slice(0, parseInt(limit)),
      count: farms.length,
      query: { search, country, climate, limit }
    });

  } catch (error) {
    console.error('[LOCATIONS_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving location data'
    });
  }
});

/**
 * GET /api/chatbot/locations/:id
 * Get details about a specific Aloe Vera farm
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": { farm object }
 * }
 */
router.get('/locations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const farm = locationService.getFarmById(parseInt(id));

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: 'Farm not found'
      });
    }

    res.json({
      success: true,
      data: farm
    });

  } catch (error) {
    console.error('[LOCATION_DETAIL_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving farm details'
    });
  }
});

/**
 * POST /api/chatbot/locations/search
 * Advanced search for Aloe Vera farms
 * 
 * Request body:
 * {
 *   "latitude": 26.2034,
 *   "longitude": -97.1964,
 *   "radiusKm": 500
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [farms within radius],
 *   "count": 3,
 *   "center": { lat, lng },
 *   "radiusKm": 500
 * }
 */
router.post('/locations/search', (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 500 } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required'
      });
    }

    const farms = locationService.getNearbyFarms(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radiusKm)
    );

    res.json({
      success: true,
      data: farms,
      count: farms.length,
      center: { lat: latitude, lng: longitude },
      radiusKm
    });

  } catch (error) {
    console.error('[LOCATION_SEARCH_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error searching locations'
    });
  }
});

/**
 * POST /api/chatbot/assess-climate
 * Assess climate suitability for Aloe Vera
 * 
 * Request body:
 * {
 *   "temperature": 25,
 *   "humidity": 40,
 *   "rainfall": 200
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "suitable": true,
 *   "factors": ["Temperature: OPTIMAL"],
 *   "recommendations": []
 * }
 */
router.post('/assess-climate', (req, res) => {
  try {
    const { temperature, humidity, rainfall } = req.body;

    const assessment = locationService.assessClimateSuitability({
      temperature: temperature ? parseFloat(temperature) : undefined,
      humidity: humidity ? parseFloat(humidity) : undefined,
      rainfall: rainfall ? parseFloat(rainfall) : undefined
    });

    res.json({
      success: true,
      ...assessment
    });

  } catch (error) {
    console.error('[CLIMATE_ASSESSMENT_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error assessing climate'
    });
  }
});

/**
 * GET /api/chatbot/session/:userId
 * Get information about user's chat session
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "user123",
 *     "messageCount": 5,
 *     "createdAt": "2026-02-04T12:00:00.000Z"
 *   }
 * }
 */
router.get('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const sessionInfo = chatbotService.getSessionInfo(userId);

    if (!sessionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: sessionInfo
    });

  } catch (error) {
    console.error('[SESSION_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving session'
    });
  }
});

/**
 * DELETE /api/chatbot/session/:userId
 * Clear user's chat session
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Session cleared"
 * }
 */
router.delete('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    chatbotService.clearSession(userId);

    res.json({
      success: true,
      message: 'Session cleared successfully'
    });

  } catch (error) {
    console.error('[SESSION_CLEAR_ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Error clearing session'
    });
  }
});

/**
 * GET /api/chatbot/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chatbot service is running',
    timestamp: new Date()
  });
});

module.exports = router;
