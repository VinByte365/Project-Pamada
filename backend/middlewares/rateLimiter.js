const passthrough = (req, res, next) => next();

const apiLimiter = passthrough;
const authLimiter = passthrough;
const scanLimiter = passthrough;
const messageLimiter = passthrough;
const liveDetectionLimiter = passthrough;

module.exports = {
  apiLimiter,
  authLimiter,
  scanLimiter,
  messageLimiter,
  liveDetectionLimiter
};

