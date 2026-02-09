# Aloe Vera Chatbot - Configuration Examples

## Production Configuration

### .env Production Setup

```bash
# ============================================================================
# PRODUCTION ENVIRONMENT
# ============================================================================

GEMINI_API_KEY=sk-YOUR_PRODUCTION_API_KEY_HERE
NODE_ENV=production
PORT=5000

# Security
CONFIDENCE_THRESHOLD=0.35
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
MAX_INPUT_LENGTH=2000

# Logging
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false

# Features
ENABLE_LOCATION_SERVICES=true
ENABLE_CLIMATE_ASSESSMENT=true
ENABLE_RESPONSE_FILTERING=true
ENABLE_SECURITY_CHECKS=true

# API
CORS_ORIGINS=https://aloevera-app.com,https://api.aloevera-app.com
API_RATE_LIMIT=100

# Gemini
GEMINI_MODEL=gemini-pro
GEMINI_TIMEOUT=30000
GEMINI_MAX_TOKENS=1024
GEMINI_TEMPERATURE=0.7
GEMINI_TOP_P=0.9

# Security
SESSION_SECRET=your_long_random_secret_min_32_chars
ENABLE_HTTPS=true
JWT_SECRET=your_jwt_secret_here

# Analytics
ENABLE_ANALYTICS=true
ANALYTICS_SERVICE=google_analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X

# Features
BETA_FEATURES_ENABLED=false
MAINTENANCE_MODE=false
DEMO_MODE=false

# Email
EMAIL_SERVICE=sendgrid
EMAIL_FROM=chatbot@aloevera-app.com
EMAIL_API_KEY=SG.YOUR_SENDGRID_KEY
ALERT_EMAILS=admin@aloevera-app.com,ops@aloevera-app.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aloe-vera?retryWrites=true
DATABASE_NAME=aloe_vera_production
```

---

## Development Configuration

### .env Development Setup

```bash
# ============================================================================
# DEVELOPMENT ENVIRONMENT
# ============================================================================

GEMINI_API_KEY=your_test_api_key_here
NODE_ENV=development
PORT=5000

# Security (lenient for development)
CONFIDENCE_THRESHOLD=0.2
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_INPUT_LENGTH=2000

# Logging (verbose)
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true

# Features (all enabled)
ENABLE_LOCATION_SERVICES=true
ENABLE_CLIMATE_ASSESSMENT=true
ENABLE_RESPONSE_FILTERING=true
ENABLE_SECURITY_CHECKS=true

# API
CORS_ORIGINS=http://localhost:3000,http://localhost:5000,http://192.168.1.*
API_RATE_LIMIT=1000

# Gemini
GEMINI_MODEL=gemini-pro
GEMINI_TIMEOUT=30000
GEMINI_MAX_TOKENS=1024
GEMINI_TEMPERATURE=0.7
GEMINI_TOP_P=0.9

# Security
SESSION_SECRET=dev_secret_key_not_secure
ENABLE_HTTPS=false
JWT_SECRET=dev_jwt_secret

# Analytics
ENABLE_ANALYTICS=false
ANALYTICS_SERVICE=none

# Features
BETA_FEATURES_ENABLED=true
MAINTENANCE_MODE=false
DEMO_MODE=false

# Email
EMAIL_SERVICE=console
EMAIL_FROM=dev@localhost

# Database
MONGODB_URI=mongodb://localhost:27017/aloe-vera-dev
DATABASE_NAME=aloe_vera_dev

# Development
DEBUG=true
SKIP_API_CALLS=false
MOCK_RESPONSE_DELAY=0
```

---

## Testing Configuration

### .env Testing Setup

```bash
# ============================================================================
# TESTING ENVIRONMENT
# ============================================================================

GEMINI_API_KEY=test_key_mock
NODE_ENV=test
PORT=5001

# Security (permissive for testing)
CONFIDENCE_THRESHOLD=0.1
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=1000
MAX_INPUT_LENGTH=2000

# Logging
LOG_LEVEL=error
ENABLE_REQUEST_LOGGING=false

# Features
ENABLE_LOCATION_SERVICES=true
ENABLE_CLIMATE_ASSESSMENT=true
ENABLE_RESPONSE_FILTERING=true
ENABLE_SECURITY_CHECKS=true

# API
CORS_ORIGINS=*
API_RATE_LIMIT=10000

# Gemini
GEMINI_MODEL=gemini-pro
GEMINI_TIMEOUT=10000
GEMINI_MAX_TOKENS=500
GEMINI_TEMPERATURE=0.5
GEMINI_TOP_P=0.9

# Security
SESSION_SECRET=test_secret_key
ENABLE_HTTPS=false
JWT_SECRET=test_jwt_secret

# Analytics
ENABLE_ANALYTICS=false

# Features
BETA_FEATURES_ENABLED=true
MAINTENANCE_MODE=false
DEMO_MODE=true

# Email
EMAIL_SERVICE=none

# Database
MONGODB_URI=mongodb://localhost:27017/aloe-vera-test
DATABASE_NAME=aloe_vera_test

# Testing
DEBUG=false
SKIP_API_CALLS=true
MOCK_RESPONSE_DELAY=0
```

---

## Advanced Configuration Examples

### High-Traffic Configuration (1000+ requests/hour)

```bash
# Optimize for throughput
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_WINDOW_MS=10000
GEMINI_TIMEOUT=20000
GEMINI_MAX_TOKENS=512
CONFIDENCE_THRESHOLD=0.35
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false
API_RATE_LIMIT=500
```

### High-Accuracy Configuration

```bash
# Optimize for accuracy
CONFIDENCE_THRESHOLD=0.6
GEMINI_TEMPERATURE=0.3  # Lower = more focused
GEMINI_TOP_P=0.8
ENABLE_RESPONSE_FILTERING=true
ENABLE_SECURITY_CHECKS=true
LOG_LEVEL=debug
```

### Cost-Optimized Configuration

```bash
# Minimize API calls
GEMINI_MAX_TOKENS=512  # Shorter responses
GEMINI_TIMEOUT=15000   # Faster timeout
RATE_LIMIT_REQUESTS=5
CONFIDENCE_THRESHOLD=0.5  # More rejections = fewer API calls
SKIP_API_CALLS=false
```

---

## Server Configuration Example

### Express Server Setup in server.js

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: './config/.env' });

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  limit: '10mb',
  extended: true
}));

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check (must be before error handlers)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Chatbot routes
const chatbotRoutes = require('./routes/chatbot');
app.use('/api/chatbot', chatbotRoutes);

// Other routes...
app.use('/api/plants', require('./routes/plants'));
app.use('/api/scans', require('./routes/scans'));
app.use('/api/auth', require('./routes/auth'));

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
```

---

## Docker Configuration

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install @google/generative-ai

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  chatbot-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/aloe-vera
    depends_on:
      - mongodb
    volumes:
      - ./backend/logs:/app/logs
    restart: unless-stopped

  mongodb:
    image: mongo:5.0
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=aloe-vera
    ports:
      - "27017:27017"
    restart: unless-stopped

volumes:
  mongodb_data:
```

---

## Nginx Configuration

### nginx.conf

```nginx
upstream chatbot_api {
  server localhost:5000;
}

server {
  listen 80;
  server_name api.aloevera-app.com;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.aloevera-app.com;

  # SSL configuration
  ssl_certificate /etc/letsencrypt/live/api.aloevera-app.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.aloevera-app.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=chatbot:10m rate=10r/s;
  limit_req zone=chatbot burst=20 nodelay;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # GZIP compression
  gzip on;
  gzip_types text/plain text/css application/json;
  gzip_min_length 1024;

  # Proxy configuration
  location /api/chatbot/ {
    proxy_pass http://chatbot_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 10s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }

  # Logging
  access_log /var/log/nginx/aloevera_access.log;
  error_log /var/log/nginx/aloevera_error.log;
}
```

---

## Monitoring & Observability

### Prometheus Metrics Config

```javascript
// services/metricsService.js
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const chatbotQueries = new prometheus.Counter({
  name: 'chatbot_queries_total',
  help: 'Total number of chatbot queries',
  labelNames: ['topic', 'result']
});

const apiErrors = new prometheus.Counter({
  name: 'api_errors_total',
  help: 'Total API errors',
  labelNames: ['type', 'endpoint']
});

module.exports = {
  httpRequestDuration,
  chatbotQueries,
  apiErrors,
  register: prometheus.register
};
```

### Logging Configuration (Winston)

```javascript
// config/logging.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

---

## Performance Tuning

### Node.js Cluster Mode

```javascript
// server.js with clustering
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Master process ${process.pid} starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Worker process
  app.listen(5000);
  console.log(`Worker ${process.pid} started`);
}
```

---

## Summary

Choose configuration based on your needs:

- **Production**: Security and stability focused
- **Development**: Debugging and rapid iteration
- **Testing**: Mock responses and extended logging
- **High-Traffic**: Optimized for throughput
- **High-Accuracy**: Optimized for response quality
- **Cost-Optimized**: Minimal API calls

All configurations are production-ready and can be deployed immediately.

---

**Last Updated**: February 2026  
**Version**: 1.0.0
