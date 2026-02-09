# Aloe Vera Chatbot - Architecture & Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────────┐  │
│   │  Mobile App        │  │  Web Browser       │  │  Third-party API    │  │
│   │  (React Native)    │  │  (React/Angular)   │  │  Client              │  │
│   └──────────┬─────────┘  └──────────┬────────┘  └──────────┬──────────┘  │
│              │                       │                       │              │
└──────────────┼───────────────────────┼───────────────────────┼──────────────┘
               │                       │                       │
               └───────────────────────┼───────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  Express.js HTTP Server             │
                    │  (PORT 5000)                        │
                    └──────────────────┬──────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│  MIDDLEWARE LAYER    │      │  ROUTE LAYER         │      │  HEALTH CHECK  │
├──────────────────────┤      ├──────────────────────┤      ├────────────────┤
│                      │      │                      │      │                │
│ • Sanitization       │      │ /api/chatbot/ask     │      │ /health        │
│ • Validation         │      │ /api/chatbot/        │      │                │
│ • Rate Limiting      │      │   locations          │      └────────────────┘
│ • Analytics Logging  │      │ /api/chatbot/        │
│ • Error Handling     │      │   assess-climate     │
│                      │      │ /api/chatbot/session │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           └─────────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │  BUSINESS LOGIC LAYER  │
         └───────────┬────────────┘
         │
         ├─ Topic Classification Service
         │  ├─ Keyword Matching
         │  ├─ Semantic Analysis
         │  ├─ Confidence Scoring
         │  └─ Location Extraction
         │
         ├─ Chatbot Service
         │  ├─ Gemini API Integration
         │  ├─ Input Filtering
         │  ├─ Output Filtering
         │  ├─ Response Validation
         │  └─ Session Management
         │
         └─ Location Service
            ├─ Farm Database
            ├─ Climate Assessment
            ├─ Proximity Search
            └─ Geolocation
         │
         └───────────┬────────────┐
                     │
         ┌───────────▼────────────┐
         │  EXTERNAL SERVICES     │
         ├────────────────────────┤
         │                        │
         │ Google Gemini API      │
         │ (LLM Backend)          │
         │                        │
         │ HTTP/HTTPS             │
         │ Timeout: 30s           │
         │                        │
         └────────────────────────┘

┌────────────────────────────────────────┐
│  DATA LAYER (Optional)                 │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐  │
│ │  MongoDB (Optional)              │  │
│ │  - Aloe Farm Locations           │  │
│ │  - Chat History                  │  │
│ │  - Analytics Data                │  │
│ │  - User Sessions                 │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │  File System (Logs)              │  │
│ │  - Query Logs                    │  │
│ │  - Error Logs                    │  │
│ │  - Analytics Logs                │  │
│ └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

---

## Request Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REQUEST PROCESSING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

HTTP Request
    │
    ▼
┌─────────────────────────────┐
│ Receive POST /chatbot/ask    │
├─────────────────────────────┤
│ {                           │
│   "message": "...",         │
│   "userId": "..."           │
│ }                           │
└──────────┬──────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Middleware Stack             │
├──────────────────────────────┤
│ 1. JSON parsing              │ ✓
│ 2. Input sanitization        │ ✓
│ 3. Rate limiting check       │ ✓ (10 req/min)
│ 4. Topic validation          │ ?
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    │             │
    YES           NO
    │             │
    ▼             ▼
CONTINUE      OFF-TOPIC
              RESPONSE
              │
              └──▶ Return fallback response
                  (2xx, isOffTopic: true)


[Continue from CONTINUE path]
    │
    ▼
┌──────────────────────────────┐
│ Topic Classification         │
├──────────────────────────────┤
│ • Normalize input            │
│ • Match keywords             │
│ • Calculate confidence       │
│ • Extract location (optional)│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Check Confidence Threshold   │
├──────────────────────────────┤
│ Threshold: 0.3 (30%)         │
│ Calculated: ?                │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ≥ 0.3         < 0.3
    │             │
    ▼             ▼
ACCEPT        REJECT
│             │
│             └──▶ Return fallback response
│                 (200, isOffTopic: true)
│
▼
┌──────────────────────────────┐
│ Get/Create User Session      │
├──────────────────────────────┤
│ • User ID: {userId}          │
│ • Create Gemini model        │
│ • Initialize history[]       │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Build System Prompt          │
├──────────────────────────────┤
│ • Base rules                 │
│ • Security constraints       │
│ • User query context         │
│ • Location context (if any)  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Call Gemini API              │
├──────────────────────────────┤
│ • model.generateContent()    │
│ • maxOutputTokens: 1024      │
│ • temperature: 0.7           │
│ • timeout: 30s               │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┐
    │             │
  SUCCESS      ERROR
    │             │
    ▼             ▼
RESPONSE      API_ERROR
│             │
│             └──▶ Log error
│                 Return 503 Service Unavailable
│                 (Error info included)
│
▼
┌──────────────────────────────┐
│ Validate Response            │
├──────────────────────────────┤
│ • Check for Aloe keywords    │
│ • Detect off-topic patterns  │
│ • Check injection attempts   │
└──────────┬───────────────────┘
           │
    ┌──────┴──────────┐
    │                 │
  VALID            INVALID
    │                 │
    ▼                 ▼
PROCEED            FALLBACK
│                  │
│                  └──▶ Return fallback response
│                      (200, isOffTopic: false)
│
▼
┌──────────────────────────────┐
│ Clean Response               │
├──────────────────────────────┤
│ • Remove markdown artifacts  │
│ • Normalize line breaks      │
│ • Trim whitespace            │
│ • Validate length            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Store in Session History     │
├──────────────────────────────┤
│ • User message entry         │
│ • Bot response entry         │
│ • Timestamp                  │
│ • Metadata                   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Log Request Analytics        │
├──────────────────────────────┤
│ • Timestamp                  │
│ • User ID                    │
│ • Query classification       │
│ • Confidence score           │
│ • Processing time            │
│ • Response status            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Build JSON Response          │
├──────────────────────────────┤
│ {                            │
│   success: true,             │
│   message: "...",            │
│   confidence: 0.88,          │
│   processingTime: 1234,      │
│   ...                        │
│ }                            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Return HTTP 200 Response     │
└──────────────────────────────┘
            │
            ▼
        Client receives response

Legend:
✓ = Completed successfully
? = Conditional
→ = Redirect/Return
```

---

## Topic Classification Decision Tree

```
User Input: "How do I grow Aloe Vera?"
│
├─ Normalize
│  Input: "how do i grow aloe vera?"
│  │
│  ├─ Remove special chars
│  ├─ Lowercase
│  ├─ Trim whitespace
│  └─ Normalize spaces
│
├─ Split into tokens
│  Tokens: ["how", "do", "i", "grow", "aloe", "vera"]
│
├─ Keyword Matching
│  │
│  ├─ "aloe" ─ MATCH (general, +2 points)
│  ├─ "vera" ─ MATCH (general, +2 points)
│  ├─ "grow" ─ MATCH (cultivation, +2 points)
│  └─ "i"    ─ NOMATCH
│
│  Total Score: 6 points
│  Categories Matched: {general: 2, cultivation: 1}
│
├─ Calculate Confidence
│  Confidence = min(score / 10, 1.0)
│  Confidence = min(6 / 10, 1.0)
│  Confidence = 0.60
│
├─ Check Threshold
│  Threshold = 0.3 (30%)
│  Calculated = 0.60 (60%)
│  0.60 >= 0.3? YES ✓
│
├─ Extract Location
│  Pattern Match: No location pattern found
│  Location: null
│
└─ Classification Result
   {
     isAloeVeraRelated: true,
     confidence: 0.60,
     matchedCategories: {
       general: 2,
       cultivation: 1
     },
     detectedLocation: null
   }
```

---

## Filtering Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 INPUT FILTERING PIPELINE                    │
└─────────────────────────────────────────────────────────────┘

Raw User Input
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Sanitization                                       │
├─────────────────────────────────────────────────────────────┤
│ • Strip control characters                                  │
│ • Remove null bytes                                         │
│ • Limit length (2000 chars max)                             │
│ • Validate encoding                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Normalization                                      │
├─────────────────────────────────────────────────────────────┤
│ • Convert to lowercase                                      │
│ • Trim whitespace                                           │
│ • Remove punctuation                                        │
│ • Normalize spacing                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Topic Detection                                    │
├─────────────────────────────────────────────────────────────┤
│ • Keyword matching (100+ keywords)                          │
│ • Semantic classification                                   │
│ • Confidence scoring                                        │
│ • Category assignment                                       │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      ALOE         OTHER
    Related        Topics
        │             │
        ▼             ▼
    CONTINUE      BLOCK
        │             │
        │             ├──▶ Log rejection
        │             │
        │             ├──▶ Return fallback response
        │             │
        │             └──▶ Analytics: OFF_TOPIC
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Security Check                                     │
├─────────────────────────────────────────────────────────────┤
│ • Injection pattern detection                               │
│ • Prompt override attempts                                  │
│ • Jailbreak indicators                                      │
│ • Malicious payload check                                   │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      SAFE         MALICIOUS
        │             │
        ▼             ▼
    CONTINUE      BLOCK
        │             │
        │             ├──▶ Security Log
        │             │
        │             ├──▶ Return error response
        │             │
        │             └──▶ Analytics: SECURITY_ISSUE
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Rate Limiting                                      │
├─────────────────────────────────────────────────────────────┤
│ • Check user request count                                  │
│ • Check time window                                         │
│ • Enforce limit (10 req/min)                                │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    UNDER LIMIT   OVER LIMIT
        │             │
        ▼             ▼
    CONTINUE      BLOCK
        │             │
        │             ├──▶ Return 429 Too Many Requests
        │             │
        │             └──▶ Analytics: RATE_LIMITED
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Filtered Input - Ready for Gemini API                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                OUTPUT FILTERING PIPELINE                    │
└─────────────────────────────────────────────────────────────┘

Gemini Response
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Validation Layer 1: Content Check                           │
├─────────────────────────────────────────────────────────────┤
│ • Contains Aloe keywords? (cultivation, care, disease, etc) │
│ • Response length OK?                                       │
│ • Valid JSON/text format?                                   │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      VALID        INVALID
        │             │
        ▼             ▼
    CONTINUE      FALLBACK
        │             │
        │             └──▶ Use fallback response
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Validation Layer 2: Pattern Check                           │
├─────────────────────────────────────────────────────────────┤
│ • Detect off-topic indicators                               │
│ • Check for hallucinations                                  │
│ • Verify logical consistency                                │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      GOOD         BAD
        │             │
        ▼             ▼
    CONTINUE      FALLBACK
        │             │
        │             └──▶ Use fallback response
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Validation Layer 3: Injection Detection                     │
├─────────────────────────────────────────────────────────────┤
│ • Check for prompt-in-response                              │
│ • Detect system instruction leakage                         │
│ • Identify manipulation markers                             │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
      CLEAN      INJECTION
        │             │
        ▼             ▼
    CONTINUE      BLOCK
        │             │
        │             ├──▶ Log security incident
        │             │
        │             ├──▶ Return error message
        │             │
        │             └──▶ Analytics: INJECTION_DETECTED
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Formatting Layer: Clean Response                            │
├─────────────────────────────────────────────────────────────┤
│ • Remove markdown artifacts                                 │
│ • Normalize line breaks                                     │
│ • Fix spacing                                               │
│ • Trim whitespace                                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Validated, Clean Response - Ready for Client                │
└─────────────────────────────────────────────────────────────┘
```

---

## Session Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SESSION MANAGEMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

First Request from User
      │
      ▼
Check Session Exists?
      │
      NO
      ▼
Create New Session
┌─────────────────────────────────┐
│ Session = {                     │
│   userId: "user_123",           │
│   model: GeminiModel,           │
│   history: [],                  │
│   messageCount: 0,              │
│   createdAt: 2026-02-04...,     │
│   lastActive: 2026-02-04...     │
│ }                               │
└─────────────────────────────────┘
      │
      ├─ Store in activeSessions Map
      │
      └─▶ Generate response
         │
         ▼
      Add to history:
      {
        role: "user",
        content: "How do I grow Aloe?",
        timestamp: ...
      }
      {
        role: "assistant",
        content: "Aloe grows best in...",
        timestamp: ...
      }

      
Second Request from Same User
      │
      ▼
Check Session Exists?
      │
      YES
      ▼
Retrieve Session
┌─────────────────────────────────┐
│ Session Found:                  │
│ - messageCount: 1               │
│ - history: [prev messages]      │
│ - lastActive: updated           │
└─────────────────────────────────┘
      │
      ├─ Use existing model instance
      │
      ├─ Context from history available
      │
      └─▶ Generate response (with context)
         │
         ▼
      Add to history:
      {
        role: "user",
        content: "Can I harvest now?",
        timestamp: ...
      }
      {
        role: "assistant",
        content: "Harvest when...",
        timestamp: ...
      }


Clear Session (Optional)
      │
      ▼
User calls DELETE /session/user_123
      │
      ▼
Session Deleted
┌─────────────────────────────────┐
│ Removed from activeSessions     │
│ History cleared                 │
│ Model instance garbage collected│
└─────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                            │
└─────────────────────────────────────────────────────────────┘

Error Occurs
    │
    ▼
Categorize Error Type
    │
    ├─ Input Validation Error
    │  │
    │  ├─ Empty message
    │  │  └─▶ 400 Bad Request
    │  │      "Message cannot be empty"
    │  │
    │  ├─ Message too long
    │  │  └─▶ 400 Bad Request
    │  │      "Message exceeds max length"
    │  │
    │  └─ Invalid format
    │     └─▶ 400 Bad Request
    │         "Invalid request format"
    │
    ├─ Rate Limiting Error
    │  │
    │  └─ Too many requests
    │     └─▶ 429 Too Many Requests
    │         "retryAfter: 45"
    │
    ├─ API Error
    │  │
    │  ├─ Gemini API timeout
    │  │  └─▶ 503 Service Unavailable
    │  │      "AI service timeout"
    │  │
    │  ├─ Invalid API key
    │  │  └─▶ 503 Service Unavailable
    │  │      "AI service error"
    │  │
    │  ├─ Network error
    │  │  └─▶ 503 Service Unavailable
    │  │      "Network error contacting API"
    │  │
    │  └─ Rate limited by Gemini
    │     └─▶ 503 Service Unavailable
    │         "AI service overloaded"
    │
    ├─ Database Error
    │  │
    │  ├─ Connection failed
    │  │  └─▶ 503 Service Unavailable
    │  │      "Database connection error"
    │  │
    │  └─ Query failed
    │     └─▶ 503 Service Unavailable
    │         "Database query error"
    │
    ├─ Security Error
    │  │
    │  ├─ Injection detected
    │  │  └─▶ 400 Bad Request
    │  │      "Invalid request"
    │  │
    │  └─ Unauthorized
    │     └─▶ 401 Unauthorized
    │
    └─ Unexpected Error
       │
       └─▶ 500 Internal Server Error
           "Internal server error"

All Errors:
├─ Log to file
├─ Log to console (development)
├─ Send to monitoring service (if configured)
├─ Alert ops team (if critical)
└─ Return user-friendly message
```

---

## Security Layers Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                                  │
└─────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────┐
     │ Layer 1: HTTP Security Headers (Helmet)             │
     │ • X-Frame-Options: SAMEORIGIN                       │
     │ • X-Content-Type-Options: nosniff                   │
     │ • X-XSS-Protection: 1; mode=block                   │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 2: CORS Protection                            │
     │ • Whitelist trusted origins                         │
     │ • Validate request origin                           │
     │ • Prevent cross-origin attacks                      │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 3: Rate Limiting                              │
     │ • Track requests per user                           │
     │ • Enforce 10 req/min limit                          │
     │ • Return 429 on overflow                            │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 4: Input Sanitization                         │
     │ • Remove control characters                         │
     │ • Validate encoding                                 │
     │ • Limit input length                                │
     │ • Strip HTML/scripts                                │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 5: Topic Validation                           │
     │ • Detect non-Aloe topics                            │
     │ • Block off-topic queries                           │
     │ • Log suspicious patterns                           │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 6: Injection Detection                        │
     │ • Detect prompt injection attempts                  │
     │ • Block "ignore instruction" patterns               │
     │ • Block "bypass" and "override" keywords            │
     │ • Validate response for injections                  │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 7: Response Filtering                         │
     │ • Validate response content                         │
     │ • Check for Aloe keywords                           │
     │ • Detect hallucinations                             │
     │ • Ensure logical consistency                        │
     └──────────────────┬──────────────────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │ Layer 8: Output Formatting                          │
     │ • Remove markdown artifacts                         │
     │ • Normalize spacing                                 │
     │ • Validate length                                   │
     │ • Escape special characters                         │
     └──────────────────┬──────────────────────────────────┘
                        │
                        ▼
     ┌────────────────────────────────────────────────────┐
     │        Safe Response Delivered to Client            │
     └────────────────────────────────────────────────────┘

Detection & Response:
├─ All attacks logged with timestamp
├─ Suspicious activity flagged
├─ Security events sent to ops
├─ Metrics tracked for analysis
└─ Incidents recorded for audit
```

---

## Database Schema (Optional Future)

```
┌──────────────────────────────────────────┐
│            Collections                   │
└──────────────────────────────────────────┘

AloeFarms
├─ _id: ObjectId
├─ name: String
├─ region: String
├─ country: String
├─ coordinates: { lat, lng }
├─ description: String
├─ capacity: String
├─ climate: String
├─ suitabilityScore: Number
├─ contact: String
├─ website: String
└─ createdAt: Date

ChatSessions
├─ _id: ObjectId
├─ userId: String
├─ messages: [
│    {
│      role: "user|assistant",
│      content: String,
│      timestamp: Date,
│      metadata: Object
│    }
│  ]
├─ createdAt: Date
├─ updatedAt: Date
└─ expiresAt: Date (TTL index)

QueryAnalytics
├─ _id: ObjectId
├─ userId: String
├─ query: String
├─ isAloeVeraRelated: Boolean
├─ confidence: Number
├─ matchedCategories: Object
├─ detectedLocation: String
├─ responseLength: Number
├─ processingTime: Number
├─ timestamp: Date
└─ sessionId: ObjectId
```

---

**These diagrams provide a complete visual reference for the chatbot architecture and flows.**
