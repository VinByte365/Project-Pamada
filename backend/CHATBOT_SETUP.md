# Aloe Vera Chatbot - Setup & Integration Guide

## Quick Start

### Prerequisites

- Node.js >= 14
- npm >= 6
- Google Gemini API key

### Step 1: Get Google Gemini API Key

1. Visit https://ai.google.dev/
2. Click "Get API Key" or "Try API key"
3. Create a new API key in Google Cloud Console
4. Copy the key

### Step 2: Install Dependencies

```bash
cd backend
npm install @google/generative-ai
```

### Step 3: Configure Environment Variables

Create/update `backend/config/.env`:

```bash
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
PORT=5000
```

### Step 4: Register Routes in Server

Update `backend/server.js`:

```javascript
// Add near other route imports
const chatbotRoutes = require('./routes/chatbot');

// Add in your middleware/routes section
app.use('/api/chatbot', chatbotRoutes);

// Make sure these are BEFORE the chatbot routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

### Step 5: Start the Server

```bash
# From backend directory
npm start
# or
node server.js
```

Server should run on `http://localhost:5000`

### Step 6: Test the API

```bash
# Test basic endpoint
curl http://localhost:5000/api/chatbot/health

# Test with a query
curl -X POST http://localhost:5000/api/chatbot/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I grow Aloe Vera?"}'
```

---

## Integration with Mobile App

### API Client Setup (React Native/Mobile)

Create `mobile/src/services/chatbotService.js`:

```javascript
import api from './api';

const chatbotService = {
  /**
   * Send message to chatbot
   * @param {string} message - User message
   * @param {string} userId - Optional user ID
   * @returns {Promise<object>} Chatbot response
   */
  async askChatbot(message, userId) {
    try {
      const response = await api.post('/chatbot/ask', {
        message,
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Chatbot error:', error);
      throw error;
    }
  },

  /**
   * Search Aloe Vera farm locations
   * @param {object} params - Search parameters
   * @returns {Promise<object>} Location results
   */
  async searchLocations(params) {
    try {
      const response = await api.get('/chatbot/locations', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Location search error:', error);
      throw error;
    }
  },

  /**
   * Get nearby farms based on coordinates
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radiusKm
   * @returns {Promise<object>} Nearby farms
   */
  async searchNearbyFarms(latitude, longitude, radiusKm = 500) {
    try {
      const response = await api.post('/chatbot/locations/search', {
        latitude,
        longitude,
        radiusKm
      });
      return response.data;
    } catch (error) {
      console.error('Nearby farms error:', error);
      throw error;
    }
  },

  /**
   * Assess climate suitability
   * @param {object} climate - Climate data
   * @returns {Promise<object>} Suitability assessment
   */
  async assessClimate(climate) {
    try {
      const response = await api.post('/chatbot/assess-climate', climate);
      return response.data;
    } catch (error) {
      console.error('Climate assessment error:', error);
      throw error;
    }
  }
};

export default chatbotService;
```

### Mobile Chat Screen Component

Create `mobile/src/screens/ChatbotScreen.js`:

```javascript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import chatbotService from '../services/chatbotService';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! I\'m your Aloe Vera expert. Ask me anything about growing, caring for, or using Aloe Vera plants. 🌿',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Get chatbot response
      const response = await chatbotService.askChatbot(inputText);

      // Add bot message
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        confidence: response.confidence,
        isOffTopic: response.isOffTopic
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUserMessage = item.sender === 'user';

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
          marginVertical: 8,
          marginHorizontal: 16
        }}
      >
        <View
          style={{
            maxWidth: '80%',
            backgroundColor: isUserMessage ? '#4CAF50' : '#E0E0E0',
            borderRadius: 12,
            padding: 12
          }}
        >
          <Text
            style={{
              color: isUserMessage ? 'white' : 'black',
              fontSize: 14,
              lineHeight: 20
            }}
          >
            {item.text}
          </Text>
          {item.confidence && (
            <Text
              style={{
                fontSize: 10,
                color: isUserMessage ? 'rgba(255,255,255,0.7)' : 'gray',
                marginTop: 4
              }}
            >
              Confidence: {(item.confidence * 100).toFixed(0)}%
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ backgroundColor: '#4CAF50', padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
            🌿 Aloe Vera Expert
          </Text>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Area */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            backgroundColor: 'white',
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 8,
              maxHeight: 100
            }}
            placeholder="Ask about Aloe Vera..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
            style={{
              backgroundColor: loading ? '#999' : '#4CAF50',
              borderRadius: 24,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ fontSize: 20 }}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChatbotScreen;
```

### Add to Navigation

Update `mobile/src/navigation/MainTabNavigator.js`:

```javascript
import ChatbotScreen from '../screens/ChatbotScreen';

const createChatbotNavigator = () => {
  return (
    <Tab.Screen
      name="Chatbot"
      component={ChatbotScreen}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="chat" color={color} size={size} />
        ),
        headerTitle: 'Aloe Vera Chatbot'
      }}
    />
  );
};
```

---

## Integration with Web Frontend

### React Chat Component

```jsx
import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! I\'m your Aloe Vera expert. How can I help?',
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        text: data.message,
        sender: 'bot',
        confidence: data.confidence
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Error: Could not reach chatbot service',
          sender: 'bot',
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>🌿 Aloe Vera Expert</h2>
      </div>

      <div className="chatbot-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message ${msg.sender} ${msg.error ? 'error' : ''}`}
          >
            <div className="message-content">{msg.text}</div>
            {msg.confidence && (
              <small>Confidence: {(msg.confidence * 100).toFixed(0)}%</small>
            )}
          </div>
        ))}
        {loading && <div className="message bot"><div className="typing">...</div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about Aloe Vera..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
```

### CSS Styling

```css
.chatbot-container {
  max-width: 500px;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: white;
}

.chatbot-header {
  background: #4CAF50;
  color: white;
  padding: 16px;
  border-radius: 8px 8px 0 0;
}

.chatbot-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9f9f9;
}

.message {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.bot {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #4CAF50;
  color: white;
}

.message.bot .message-content {
  background: #e0e0e0;
  color: black;
}

.message.error .message-content {
  background: #f44336;
  color: white;
}

.message small {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.chatbot-input {
  display: flex;
  padding: 12px;
  border-top: 1px solid #ddd;
  gap: 8px;
}

.chatbot-input input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 24px;
  padding: 10px 16px;
  font-size: 14px;
}

.chatbot-input button {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: bold;
}

.chatbot-input button:disabled {
  background: #999;
  cursor: not-allowed;
}

.typing {
  animation: blink 1.4s infinite;
}

@keyframes blink {
  0%, 20%, 50%, 80%, 100% { opacity: 1; }
  40% { opacity: 0.2; }
  60% { opacity: 0.5; }
}
```

---

## Database Integration (Future)

To replace mock location data with database:

### 1. Update Location Service

```javascript
const Aloe Farm = require('../models/aloeFarm');

const searchFarmsByLocation = async (searchTerm) => {
  return await AloeF arm.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { region: { $regex: searchTerm, $options: 'i' } },
      { country: { $regex: searchTerm, $options: 'i' } }
    ]
  });
};
```

### 2. Create Aloe Farm Model

```javascript
// backend/models/aloeFarm.js
const mongoose = require('mongoose');

const aloeFarmSchema = new mongoose.Schema({
  name: { type: String, required: true },
  region: String,
  country: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  description: String,
  capacity: String,
  climate: String,
  suitabilityScore: Number,
  contact: String,
  website: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AloeFarm', aloeFarmSchema);
```

---

## Monitoring & Analytics

### Log Queries

Create `backend/utils/chatbotLogger.js`:

```javascript
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logQuery = (data) => {
  const logFile = path.join(logsDir, `chatbot-${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = `${new Date().toISOString()} | ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logFile, logEntry);
};

module.exports = { logQuery };
```

### Get Analytics

```javascript
// In routes/chatbot.js
router.get('/analytics/summary', (req, res) => {
  // Read logs and generate summary
  const stats = {
    totalQueries: 1250,
    aloeRelatedPercent: 87,
    averageConfidence: 0.82,
    topicDistribution: {
      cultivation: 35,
      care: 28,
      diseases: 18,
      harvesting: 12,
      other: 7
    }
  };

  res.json(stats);
});
```

---

## Environment Variables Reference

```bash
# Required
GEMINI_API_KEY=your_api_key

# Optional
NODE_ENV=production              # development/production
PORT=5000                        # Server port
LOG_LEVEL=info                   # debug/info/warn/error
RATE_LIMIT_REQUESTS=10           # Requests per window
RATE_LIMIT_WINDOW_MS=60000       # Window in milliseconds
CONFIDENCE_THRESHOLD=0.3         # Topic confidence threshold
MONGODB_URI=your_db_uri          # For database (future)
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `API key not found` | Add GEMINI_API_KEY to .env file |
| `Module not found @google/generative-ai` | Run `npm install @google/generative-ai` |
| `CORS errors` | Ensure CORS middleware is configured in server.js |
| `Rate limit exceeded` | Adjust RATE_LIMIT_REQUESTS or implement request queue |
| `High latency` | Consider caching common queries or upgrading API plan |

---

## Support & Documentation

- Full API Docs: See `CHATBOT_DOCUMENTATION.md`
- Test Suite: Run `node backend/tests/chatbot.test.js`
- Issue Tracking: Create GitHub issues with `[CHATBOT]` prefix
- Email Support: chatbot@aloe-vera-app.com

---

**Last Updated**: February 2026  
**Version**: 1.0.0
