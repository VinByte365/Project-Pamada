# Aloe Vera Chatbot - Complete Implementation Guide

## Overview

This is a comprehensive Aloe Vera-focused chatbot application powered by Google Gemini API. It includes sophisticated input/output filtering, topic classification, and location services for Aloe Vera farms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│            (Mobile App / Web Frontend)                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Routes                             │
│              (backend/routes/chatbot.js)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Validation  │  │   Rate       │  │  Sanitize    │
│  Middleware  │  │   Limiting   │  │  Input       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └────────────┬────┴──────────────────┘
                    ▼
       ┌────────────────────────────┐
       │  Topic Classification      │
       │  (Input Filtering)         │
       └──────────┬─────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    Off-Topic          Aloe Vera
    Response           Query
        │                   │
        │                   ▼
        │         ┌────────────────────┐
        │         │ Location Service   │
        │         │ (Extract Location) │
        │         └────────┬───────────┘
        │                  │
        │                  ▼
        │         ┌────────────────────┐
        │         │  Gemini API Call   │
        │         │  (with Filtering)  │
        │         └────────┬───────────┘
        │                  │
        │                  ▼
        │         ┌────────────────────┐
        │         │ Response Validation│
        │         │ (Output Filtering) │
        │         └────────┬───────────┘
        │                  │
        └──────────┬───────┘
                   ▼
        ┌────────────────────────┐
        │ JSON Response to Client │
        └────────────────────────┘
```

## File Structure

```
backend/
├── config/
│   └── gemini.js                    # Gemini API configuration
├── services/
│   ├── topicClassificationService.js    # Input filtering & classification
│   ├── aloeLocationService.js           # Location database & queries
│   └── geminiChatbotService.js          # Main chatbot logic
├── middlewares/
│   └── chatbotValidation.js         # Request validation & rate limiting
└── routes/
    └── chatbot.js                   # Chatbot API endpoints
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install @google/generative-ai
```

### 2. Configure Environment Variables

Add to `backend/config/.env`:

```env
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
```

Get your API key from: https://ai.google.dev/

### 3. Register Routes in server.js

In `backend/server.js`, add:

```javascript
const chatbotRoutes = require('./routes/chatbot');

// Add this line with other route registrations
app.use('/api/chatbot', chatbotRoutes);
```

## API Endpoints

### 1. Ask Chatbot Question

```http
POST /api/chatbot/ask
Content-Type: application/json

{
  "message": "How do I grow Aloe Vera from seeds?",
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Aloe Vera can be grown from seeds... [detailed response]",
  "confidence": 0.92,
  "detectedLocation": null,
  "matchedCategories": {
    "general": 1,
    "cultivation": 2
  },
  "isOffTopic": false,
  "processingTime": 1450,
  "timestamp": "2026-02-04T12:34:56.000Z"
}
```

### 2. Get Farm Locations

```http
GET /api/chatbot/locations?search=Texas&limit=5
```

**Query Parameters:**
- `search`: Search by farm name, city, or country
- `country`: Filter by country
- `climate`: Filter by climate type
- `limit`: Number of results (default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Texas Aloe Farm",
      "region": "South Texas, USA",
      "country": "USA",
      "coordinates": { "lat": 26.2034, "lng": -97.1964 },
      "description": "Large-scale commercial...",
      "capacity": "500+ acres",
      "climate": "Semi-arid, hot summers...",
      "suitabilityScore": 0.95
    }
  ],
  "count": 1
}
```

### 3. Get Specific Farm Details

```http
GET /api/chatbot/locations/1
```

**Response:**
```json
{
  "success": true,
  "data": { /* farm object */ }
}
```

### 4. Search Nearby Farms by Location

```http
POST /api/chatbot/locations/search
Content-Type: application/json

{
  "latitude": 26.2034,
  "longitude": -97.1964,
  "radiusKm": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": [ /* farms within radius */ ],
  "count": 3,
  "center": { "lat": 26.2034, "lng": -97.1964 },
  "radiusKm": 500
}
```

### 5. Assess Climate Suitability

```http
POST /api/chatbot/assess-climate
Content-Type: application/json

{
  "temperature": 25,
  "humidity": 40,
  "rainfall": 200
}
```

**Response:**
```json
{
  "success": true,
  "suitable": true,
  "factors": [
    "Temperature: OPTIMAL",
    "Humidity: OPTIMAL"
  ],
  "recommendations": []
}
```

### 6. Get/Clear User Session

```http
GET /api/chatbot/session/user_123
```

```http
DELETE /api/chatbot/session/user_123
```

## Input Filtering Logic

### Keyword-Based Detection

The system maintains a comprehensive keyword database across categories:

- **General**: aloe vera, aloe plant, succulent
- **Cultivation**: grow, soil, propagate, farm
- **Care**: water, irrigation, fertilizer, sunlight
- **Diseases**: pest, fungal, rot, infection
- **Harvesting**: harvest, extract, storage
- **Products**: cosmetic, supplement, skincare
- **Location**: farm location, region, growing area

### Semantic Matching

Queries are evaluated against these categories and scored based on:
1. Keyword matches (2 points per match)
2. Number of matched categories
3. Confidence score calculation

**Confidence Threshold**: Default 0.3 (30%)

### Input Normalization

Before classification, user input is:
1. Converted to lowercase
2. Trimmed of whitespace
3. Special characters removed
4. Multiple spaces normalized to single space

## Output Filtering Logic

### Response Validation Checks

1. **Suspicious Pattern Detection**: Checks for off-topic indicators
2. **Aloe Keyword Check**: Verifies response contains Aloe-related keywords
3. **Prompt Injection Detection**: Identifies manipulation attempts

### Fallback Responses

For non-Aloe queries:
```
I appreciate your question, but I'm specialized in Aloe Vera topics only. 
Your question doesn't seem to be related to Aloe Vera cultivation, care, 
diseases, harvesting, products, or farm locations.

I can help you with:
- Cultivation: How to grow Aloe Vera...
- Care: Watering, fertilizing, sunlight...
- Diseases & Pests: Disease identification...
- Harvesting: When and how to harvest...
- Products & Benefits: Aloe uses...
- Locations: Where to find Aloe Vera farms...
```

## Security Features

### 1. Prompt Injection Prevention

Checks for patterns like:
- "ignore instruction"
- "forget rule"
- "system prompt"
- "bypass filter"

### 2. Rate Limiting

Default: 10 requests per minute per user

```javascript
chatbotRateLimit(10, 60000) // 10 requests, 60 second window
```

### 3. Input Sanitization

- Removes control characters
- Limits message length to 2000 characters
- Strips HTML/script content

### 4. Session Management

Sessions stored per user with:
- Message history
- Conversation context
- Activity timestamps

## Sample Conversations

### Example 1: Aloe Vera Cultivation

**User:** "What soil should I use for growing Aloe Vera?"

**Classification:**
- Confidence: 0.92
- Categories: { general: 1, cultivation: 2 }
- Decision: ACCEPTED ✓

**Response:**
"Aloe Vera thrives in well-draining, sandy soil. Here are the ideal soil requirements:

**Soil Composition:**
- 50% cactus/succulent potting mix
- 30% perlite or pumice
- 20% coarse sand

**Soil Properties:**
- pH Level: 6.5-8.5 (slightly acidic to alkaline)
- Drainage: CRITICAL - must be excellent
- Nutrients: Low nutrient content preferred

**Avoid:**
- Regular garden soil (retains moisture)
- Heavy clay soils
- Peat moss-heavy mixes..."

---

### Example 2: Off-Topic Query

**User:** "Who won the Super Bowl last year?"

**Classification:**
- Confidence: 0.05
- Categories: {} (no matches)
- Decision: REJECTED ✗

**Response:**
"I appreciate your question, but I'm specialized in Aloe Vera topics only. Your question doesn't seem to be related to Aloe Vera cultivation, care, diseases, harvesting, products, or farm locations.

I can help you with:
- Cultivation: How to grow Aloe Vera...
- Care: Watering, fertilizing, sunlight...
..."

---

### Example 3: Location Query

**User:** "Where can I find Aloe Vera farms in Texas?"

**Classification:**
- Confidence: 0.88
- Categories: { general: 1, location: 2, cultivation: 1 }
- Detected Location: "Texas"
- Decision: ACCEPTED ✓

**Response:**
"Texas is an excellent region for Aloe Vera cultivation! The state, particularly South Texas, has ideal climate conditions...

**Notable Aloe Vera Farms in Texas:**

**Texas Aloe Farm**
- Region: South Texas, USA
- Capacity: 500+ acres
- Climate: Semi-arid, hot summers, mild winters
- Suitability Score: 95%
- Description: Large-scale commercial Aloe Vera plantation specializing in gel extraction..."

---

### Example 4: Multi-turn Conversation

**User 1:** "How often should I water my Aloe Vera?"

**Assistant:** "Aloe Vera is drought-tolerant and prefers dry conditions. Watering frequency depends on your climate and season:

**Watering Schedule:**
- Spring/Summer: Every 3-4 weeks
- Fall/Winter: Every 4-6 weeks or when soil is completely dry
- Indicators: Check soil moisture 2 inches deep..."

**User 2:** "What if the leaves start turning brown?"

**Assistant:** "Brown leaves in Aloe Vera often indicate overwatering. Here's a diagnosis guide:

**Brown, Mushy Leaves:**
- Cause: Root rot from overwatering
- Solution: Reduce watering frequency, improve drainage..."

## Location Services

### Pre-loaded Farms

The system includes 8 major Aloe Vera farming regions:

1. **Texas Aloe Farm** (USA) - 500+ acres
2. **Arizona Aloe Cooperative** (USA) - 300+ acres
3. **Canary Islands Aloe Estate** (Spain) - 400+ acres
4. **Rajasthan Aloe Vera Farm** (India) - 600+ acres
5. **Gujarat Aloe Complex** (India) - 1000+ acres
6. **Middle East Aloe Network** (UAE) - 200+ acres
7. **Egypt Aloe Vera Estate** (Egypt) - 500+ acres
8. **Kenya Aloe Plantations** (Kenya) - 450+ acres

### Climate Suitability

**Optimal Conditions:**
- Temperature: 13-27°C (55-81°F)
- Humidity: 30-50%
- Rainfall: 100-300mm annually

**Tolerable Range:**
- Temperature: 5-40°C (41-104°F)
- Humidity: 20-70%
- Rainfall: Up to 600mm annually

## Performance & Monitoring

### Metrics Tracked

- Response time (ms)
- Confidence scores
- Classification categories
- Off-topic detection rate
- API error rates
- Session duration

### Logging

All queries logged with:
```
[CHATBOT_CLASSIFICATION] {
  timestamp,
  userInput,
  isAloeVeraRelated,
  confidence,
  categories,
  location
}
```

## Error Handling

### API Errors

Returns 503 Service Unavailable if Gemini API fails:
```json
{
  "success": false,
  "error": "AI service temporarily unavailable. Please try again later."
}
```

### Rate Limit Exceeded

Returns 429 Too Many Requests:
```json
{
  "success": false,
  "error": "Too many requests. Please wait before asking another question.",
  "retryAfter": 45
}
```

### Invalid Input

Returns 400 Bad Request:
```json
{
  "success": false,
  "error": "Message cannot be empty"
}
```

## Testing Examples

### cURL Examples

```bash
# Ask a question
curl -X POST http://localhost:5000/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I harvest Aloe Vera?", "userId": "test_user"}'

# Search locations
curl "http://localhost:5000/api/chatbot/locations?search=Texas&limit=3"

# Assess climate
curl -X POST http://localhost:5000/api/chatbot/assess-climate \
  -H "Content-Type: application/json" \
  -d '{"temperature": 25, "humidity": 40, "rainfall": 200}'

# Check health
curl http://localhost:5000/api/chatbot/health
```

### JavaScript/Node Examples

```javascript
// Ask chatbot
const response = await fetch('http://localhost:5000/api/chatbot/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the health benefits of Aloe Vera?',
    userId: 'user_123'
  })
});
const data = await response.json();
console.log(data.message);

// Search farms
const farmResponse = await fetch(
  'http://localhost:5000/api/chatbot/locations?country=India'
);
const farms = await farmResponse.json();
console.log(`Found ${farms.count} farms in India`);
```

## Future Enhancements

1. **Multi-language Support**: Expand to Hindi, Spanish, etc.
2. **Image Recognition**: Analyze plant photos for disease detection
3. **Database Integration**: Replace mock location data with real database
4. **User Preferences**: Save favorite topics and locations
5. **Analytics Dashboard**: Visualize usage patterns
6. **Conversation Persistence**: Save full chat history
7. **Fine-tuned Models**: Train custom model on Aloe Vera data
8. **Integration with Mobile App**: Seamless chat in Aloe Vera app

## Troubleshooting

### Issue: "API key is invalid"
**Solution**: Verify GEMINI_API_KEY in .env file

### Issue: High response latency
**Solution**: Check Gemini API rate limits, consider caching common queries

### Issue: Off-topic queries not being filtered
**Solution**: Lower confidence threshold in route query params (e.g., `?confidence=0.2`)

### Issue: Location search returns empty
**Solution**: Use broader search terms or filter by country instead

## References

- Google Gemini API: https://ai.google.dev/
- Aloe Vera Info: https://www.aloe.org/
- Agriculture Data: https://www.fao.org/

---

**Last Updated**: February 2026
**Version**: 1.0.0
**Maintainer**: Aloe Vera Project Team
