module.exports = function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
};

