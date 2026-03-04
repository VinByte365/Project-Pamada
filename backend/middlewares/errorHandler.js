const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let details;

  // Log error for debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    statusCode = 404;
    code = 'NOT_FOUND';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    details = err.keyValue || undefined;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((val) => val.message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    statusCode = 401;
    code = 'AUTH_INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    statusCode = 401;
    code = 'AUTH_TOKEN_EXPIRED';
  }

  // Body parser JSON parse errors
  if (err.type === 'entity.parse.failed') {
    error.message = 'Invalid JSON payload';
    statusCode = 400;
    code = 'INVALID_JSON';
  }

  // Upload validation errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'INVALID_UPLOAD';
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'Uploaded file is too large';
      code = 'FILE_TOO_LARGE';
    } else {
      error.message = err.message || 'Invalid file upload';
    }
  }

  if (statusCode === 500 && /timeout/i.test(error.message || '')) {
    statusCode = 504;
    code = 'UPSTREAM_TIMEOUT';
  }

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

