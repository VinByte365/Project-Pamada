# Aloe Vera Chatbot - Implementation Checklist

## Pre-Implementation
- [ ] Review entire documentation (CHATBOT_DOCUMENTATION.md)
- [ ] Obtain Google Gemini API key
- [ ] Ensure Node.js >= 14 is installed
- [ ] Backup existing backend code

## Backend Setup
- [ ] Install `@google/generative-ai` package
- [ ] Create `.env` file with GEMINI_API_KEY
- [ ] Create `config/gemini.js`
- [ ] Create `services/topicClassificationService.js`
- [ ] Create `services/aloeLocationService.js`
- [ ] Create `services/geminiChatbotService.js`
- [ ] Create `middlewares/chatbotValidation.js`
- [ ] Create `routes/chatbot.js`
- [ ] Register chatbot routes in `server.js`

## Testing
- [ ] Test health endpoint: `GET /api/chatbot/health`
- [ ] Test with valid Aloe Vera query
- [ ] Test with invalid/off-topic query
- [ ] Test location search
- [ ] Test rate limiting
- [ ] Run test suite: `node backend/tests/chatbot.test.js`

## Documentation
- [ ] Review CHATBOT_DOCUMENTATION.md
- [ ] Review CHATBOT_SETUP.md
- [ ] Share documentation with team
- [ ] Update project README.md with chatbot section

## Mobile Integration (Optional)
- [ ] Create `chatbotService.js` in mobile services
- [ ] Create `ChatbotScreen.js` component
- [ ] Integrate into navigation
- [ ] Test on device
- [ ] Add UI/UX improvements

## Web Integration (Optional)
- [ ] Create React ChatBot component
- [ ] Add CSS styling
- [ ] Integrate into dashboard
- [ ] Test across browsers
- [ ] Optimize performance

## Database Integration (Optional)
- [ ] Create `AloeF arm` model
- [ ] Migrate mock data to database
- [ ] Update location service methods
- [ ] Add CRUD operations
- [ ] Test all queries

## Monitoring & Analytics
- [ ] Implement logging system
- [ ] Create analytics endpoints
- [ ] Set up error tracking
- [ ] Create dashboard (optional)
- [ ] Monitor API usage

## Deployment
- [ ] Update production .env file
- [ ] Run security audit
- [ ] Load testing
- [ ] Create deployment guide
- [ ] Set up CI/CD pipeline

## Post-Deployment
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Track usage metrics
- [ ] Plan improvements
- [ ] Document learnings

---

# Environment Variables Template

Create `.env` file in backend directory:

```bash
# ============================================================================
# REQUIRED CONFIGURATION
# ============================================================================

# Google Gemini API Key (https://ai.google.dev/)
GEMINI_API_KEY=your_actual_api_key_here

# Node Environment
NODE_ENV=production  # or 'development'

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# Server Port
PORT=5000

# Server Host
HOST=localhost

# ============================================================================
# CHATBOT CONFIGURATION
# ============================================================================

# Topic Classification Confidence Threshold (0-1)
# Lower = more permissive, Higher = more strict
CONFIDENCE_THRESHOLD=0.3

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000

# Maximum input length in characters
MAX_INPUT_LENGTH=2000

# Maximum output length in characters
MAX_OUTPUT_LENGTH=2000

# ============================================================================
# LOGGING & MONITORING
# ============================================================================

# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# Log Directory
LOG_DIR=./logs

# Enable request logging
ENABLE_REQUEST_LOGGING=true

# ============================================================================
# DATABASE CONFIGURATION (Future Use)
# ============================================================================

# MongoDB Connection String (if using database for locations)
MONGODB_URI=mongodb://localhost:27017/aloe-vera

# Database Name
DATABASE_NAME=aloe_vera_db

# ============================================================================
# FEATURE FLAGS
# ============================================================================

# Enable location services
ENABLE_LOCATION_SERVICES=true

# Enable climate assessment
ENABLE_CLIMATE_ASSESSMENT=true

# Enable response filtering
ENABLE_RESPONSE_FILTERING=true

# Enable prompt injection detection
ENABLE_SECURITY_CHECKS=true

# ============================================================================
# API CONFIGURATION
# ============================================================================

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5000,https://aloevera-app.com

# API Rate Limit (requests per minute)
API_RATE_LIMIT=100

# ============================================================================
# GEMINI API CONFIGURATION
# ============================================================================

# Gemini Model (change if needed)
GEMINI_MODEL=gemini-pro

# Gemini API Timeout (ms)
GEMINI_TIMEOUT=30000

# Gemini Max Output Tokens
GEMINI_MAX_TOKENS=1024

# Gemini Temperature (0-2, higher = more random)
GEMINI_TEMPERATURE=0.7

# Gemini Top P (0-1, nucleus sampling)
GEMINI_TOP_P=0.9

# ============================================================================
# SECURITY
# ============================================================================

# Session Secret
SESSION_SECRET=your_secret_key_here_min_32_chars

# Enable HTTPS (production only)
ENABLE_HTTPS=true

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# ============================================================================
# ANALYTICS & TRACKING
# ============================================================================

# Enable analytics collection
ENABLE_ANALYTICS=true

# Analytics Service (if using external service)
ANALYTICS_SERVICE=google_analytics

# Google Analytics ID
GOOGLE_ANALYTICS_ID=your_ga_id

# ============================================================================
# FEATURE TOGGLES
# ============================================================================

# Beta features
BETA_FEATURES_ENABLED=false

# Maintenance mode
MAINTENANCE_MODE=false

# Demo mode (uses mock responses)
DEMO_MODE=false

# ============================================================================
# EMAIL CONFIGURATION (For Alerts/Feedback)
# ============================================================================

# Email Service (gmail, sendgrid, etc.)
EMAIL_SERVICE=sendgrid

# Email from address
EMAIL_FROM=chatbot@aloe-vera-app.com

# Email API Key
EMAIL_API_KEY=your_email_api_key

# Alert email addresses (comma-separated)
ALERT_EMAILS=admin@aloe-vera-app.com

# ============================================================================
# DEVELOPMENT ONLY
# ============================================================================

# Debug mode
DEBUG=false

# Skip API calls (use mock responses)
SKIP_API_CALLS=false

# Mock response delay (ms)
MOCK_RESPONSE_DELAY=500
```

---

# Quick Start Script

Create `backend/scripts/setup-chatbot.sh`:

```bash
#!/bin/bash

set -e

echo "🌿 Aloe Vera Chatbot - Setup Script"
echo "===================================="

# Check if .env exists
if [ ! -f "config/.env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example config/.env 2>/dev/null || echo "GEMINI_API_KEY=your_api_key_here" > config/.env
    echo "✓ .env file created. Please update with your API key."
else
    echo "✓ .env file exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    npm install @google/generative-ai
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Create logs directory
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
    echo "✓ Logs directory created"
else
    echo "✓ Logs directory exists"
fi

# Test API
echo "🧪 Testing chatbot setup..."
echo ""
echo "Run the following to test:"
echo "  curl http://localhost:5000/api/chatbot/health"
echo ""
echo "Then start the server with:"
echo "  npm start"

echo ""
echo "✨ Setup complete!"
```

Run it:
```bash
chmod +x backend/scripts/setup-chatbot.sh
./backend/scripts/setup-chatbot.sh
```

---

# Integration Testing Checklist

## Unit Tests
- [ ] Topic classification correctness
- [ ] Input normalization
- [ ] Location extraction
- [ ] Climate assessment logic
- [ ] Response validation

## Integration Tests
- [ ] API endpoint connectivity
- [ ] Database operations (if applicable)
- [ ] External API calls (Gemini)
- [ ] Error handling
- [ ] Rate limiting

## E2E Tests
- [ ] Full conversation flow
- [ ] Aloe Vera query acceptance
- [ ] Off-topic query rejection
- [ ] Location-based responses
- [ ] Session management

## Performance Tests
- [ ] Response time < 2 seconds
- [ ] Handle 100+ concurrent users
- [ ] Memory usage stable
- [ ] API error recovery

## Security Tests
- [ ] Prompt injection prevention
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting effectiveness

---

# Deployment Checklist

## Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation updated

## Deployment Steps
- [ ] Update production .env
- [ ] Build application
- [ ] Run migrations (if any)
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor logs and metrics

## Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check error rates
- [ ] Monitor API usage
- [ ] Gather user feedback
- [ ] Plan rollback (if needed)

---

# Support Resources

## Documentation Files
- `CHATBOT_DOCUMENTATION.md` - Complete API and architecture guide
- `CHATBOT_SETUP.md` - Setup and integration guide
- `backend/tests/chatbot.test.js` - Test suite and examples

## API Endpoints Reference
```
POST   /api/chatbot/ask                    - Send message to chatbot
GET    /api/chatbot/locations              - Search farm locations
GET    /api/chatbot/locations/:id          - Get farm details
POST   /api/chatbot/locations/search       - Search by coordinates
POST   /api/chatbot/assess-climate         - Climate suitability
GET    /api/chatbot/session/:userId        - Get session info
DELETE /api/chatbot/session/:userId        - Clear session
GET    /api/chatbot/health                 - Health check
```

## Common Commands

```bash
# Start server
npm start

# Run tests
node backend/tests/chatbot.test.js

# Check API health
curl http://localhost:5000/api/chatbot/health

# Ask a question
curl -X POST http://localhost:5000/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I grow Aloe Vera?"}'

# Search locations
curl "http://localhost:5000/api/chatbot/locations?search=Texas"
```

## Troubleshooting Contacts

- API Issues: support@google.com (Gemini API)
- Database Issues: mongodb-support
- General Support: chatbot@aloe-vera-app.com

---

**Created**: February 2026  
**Version**: 1.0.0  
**Status**: Ready for Implementation
