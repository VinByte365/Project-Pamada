/**
 * Topic Validation Middleware
 * Validates incoming chatbot requests for Aloe Vera topic compliance
 */

const { classifyQuery, logFilteredQuery } = require('../services/topicClassificationService');

/**
 * Middleware to validate topic before processing
 * Rejects non-Aloe Vera queries at middleware level
 */
const validateAloeVeraTopic = (confidenceThreshold = 0.3) => {
  return async (req, res, next) => {
    try {
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message cannot be empty'
        });
      }

      // Classify the query
      const classification = classifyQuery(message, confidenceThreshold);

      // Attach classification to request for downstream handlers
      req.classification = classification;

      // Log for monitoring
      logFilteredQuery({
        ...classification,
        reason: 'MIDDLEWARE_CHECK'
      });

      // Allow all requests to proceed (chatbot service will handle rejection)
      // This provides better UX by generating contextual rejection messages
      next();

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR]', error);
      res.status(500).json({
        success: false,
        error: 'Error validating request'
      });
    }
  };
};

/**
 * Middleware to log query analytics
 */
const logQueryAnalytics = (req, res, next) => {
  try {
    const { classification } = req;
    const userId = req.user?.id || req.ip;

    // Parse and store analytics data
    const analyticsData = {
      userId,
      timestamp: new Date(),
      isAloeVeraRelated: classification?.isAloeVeraRelated || false,
      confidence: classification?.confidence || 0,
      categories: classification?.matchedCategories || {},
      detectedLocation: classification?.detectedLocation || null,
      userInput: req.body.message
    };

    // Store in request for logging in response handler
    req.analyticsData = analyticsData;

    next();
  } catch (error) {
    // Don't block request if analytics fails
    console.warn('[ANALYTICS_WARNING]', error.message);
    next();
  }
};

/**
 * Rate limiting middleware specific to chatbot
 * Prevents abuse and excessive API calls
 */
const chatbotRateLimit = (maxRequests = 10, windowMs = 60000) => {
  const requestLog = new Map();

  return (req, res, next) => {
    try {
      const userId = req.user?.id || req.ip;
      const now = Date.now();

      if (!requestLog.has(userId)) {
        requestLog.set(userId, []);
      }

      const userRequests = requestLog.get(userId);

      // Remove old requests outside window
      const recentRequests = userRequests.filter(time => now - time < windowMs);
      requestLog.set(userId, recentRequests);

      if (recentRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please wait before asking another question.',
          retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
        });
      }

      recentRequests.push(now);
      next();

    } catch (error) {
      console.warn('[RATE_LIMIT_ERROR]', error.message);
      next(); // Don't block on error
    }
  };
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    let { message } = req.body;

    // Remove potentially harmful characters
    message = message
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '') // Remove control characters
      .trim();

    // Limit message length
    if (message.length > 2000) {
      message = message.substring(0, 2000);
    }

    req.body.message = message;
    next();

  } catch (error) {
    console.warn('[SANITIZATION_ERROR]', error.message);
    next(); // Don't block on error
  }
};

/**
 * Error handling middleware for chatbot
 */
const chatbotErrorHandler = (err, req, res, next) => {
  console.error('[CHATBOT_ERROR_HANDLER]', {
    error: err.message,
    stack: err.stack,
    userId: req.user?.id || req.ip,
    timestamp: new Date()
  });

  if (err.message.includes('API') || err.message.includes('Gemini')) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable. Please try again later.'
    });
  }

  res.status(500).json({
    success: false,
    error: 'An error occurred processing your request.'
  });
};

module.exports = {
  validateAloeVeraTopic,
  logQueryAnalytics,
  chatbotRateLimit,
  sanitizeInput,
  chatbotErrorHandler
};
