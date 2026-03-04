const rateLimit = require('express-rate-limit');

const createRateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    error: message,
    code: 'RATE_LIMIT',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  handler: createRateLimitHandler('Too many requests from this IP, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  handler: createRateLimitHandler('Too many login attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Scan upload rate limiter
const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 scans per hour
  handler: createRateLimitHandler('Too many scan uploads, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Messaging rate limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  handler: createRateLimitHandler('Too many messages sent. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Live detection frame limiter
const liveDetectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3000,
  handler: createRateLimitHandler('Too many live detection requests. Please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  scanLimiter,
  messageLimiter,
  liveDetectionLimiter
};

