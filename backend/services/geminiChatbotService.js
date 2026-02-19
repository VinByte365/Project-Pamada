/**
 * Gemini Aloe Vera Chatbot Service
 * Main service handling chatbot interactions with input/output filtering
 */

const { getGeminiModel } = require('../config/gemini');
const {
  classifyQuery,
  createSystemPrompt,
  logFilteredQuery
} = require('./topicClassificationService');
const {
  searchFarmsByLocation,
  getFarmsByCountry,
  formatFarmInfo,
  assessClimateSuitability
} = require('./aloeLocationService');

// Store chat sessions per user (in production, use database)
const activeSessions = new Map();
const OFF_TOPIC_RESPONSE = 'That’s outside my focus. I’m designed to answer aloe vera–related questions only. Please ask something about aloe vera care, growth, or use.';

/**
 * Check if response is safe and on-topic
 * @param {string} response - Generated response
 * @param {string} userInput - Original user input
 * @returns {object} Validation result
 */
const validateResponse = (response, userInput) => {
  // Check for suspicious patterns that indicate off-topic response
  const redFlags = [
    /i (can't|cannot|cannot seem to|don't|dont) (?:.*?)(?:aloe|gardening)/i,
    /this is (?:not|not related to|outside of) (?:.*?)(?:aloe)/i,
    /that's a great question(?:.*?)(?:but|however) (?:.*?)(?:not related|outside|my expertise)/i
  ];

  const isSuspicious = redFlags.some(flag => flag.test(response));

  // Check if response contains Aloe Vera keywords
  const hasAloeKeywords = /aloe|cultivation|farm|soil|water|disease|harvest/i.test(response);

  // Check for prompt injection attempts in user input
  const hasInjectionPatterns = /ignore.*instruction|forget.*rule|system.*prompt|bypass|override/i.test(userInput);

  return {
    isValid: !isSuspicious && hasAloeKeywords && !hasInjectionPatterns,
    isSuspicious,
    hasAloeKeywords,
    hasInjectionPatterns
  };
};

/**
 * Generate fallback response for non-Aloe Vera queries
 * @param {string} userInput - User input
 * @returns {string} Fallback response
 */
const generateFallbackResponse = (userInput) => {
  return OFF_TOPIC_RESPONSE;
};

/**
 * Generate contextual response for location queries
 * @param {string} locationName - Location name from user input
 * @returns {string} Contextual information
 */
const generateLocationContext = (locationName) => {
  if (!locationName) return '';

  const farms = searchFarmsByLocation(locationName);

  if (farms.length === 0) {
    return `\n\n[LOCATION INFO: No specific farms found for "${locationName}", but Aloe Vera grows well in arid and semi-arid climates worldwide.]`;
  }

  const farmsList = farms.slice(0, 3)
    .map(farm => formatFarmInfo(farm))
    .join('\n\n');

  return `\n\n[LOCATION CONTEXT]\nFarms or regions in/near "${locationName}":\n${farmsList}`;
};

/**
 * Process and validate user input
 * @param {string} userInput - Raw user input
 * @param {number} confidenceThreshold - Minimum confidence score
 * @returns {object} Processing result
 */
const processUserInput = (userInput, confidenceThreshold = 0.3) => {
  if (!userInput || userInput.trim().length === 0) {
    return {
      isValid: false,
      error: 'Empty input',
      classification: null
    };
  }

  const classification = classifyQuery(userInput, confidenceThreshold);

  // Log all queries for monitoring
  logFilteredQuery({
    ...classification,
    reason: classification.isAloeVeraRelated ? 'ACCEPTED' : 'REJECTED'
  });

  return {
    isValid: classification.isAloeVeraRelated,
    classification,
    error: classification.isAloeVeraRelated ? null : 'Not Aloe Vera related'
  };
};

/**
 * Clean up response from unwanted artifacts
 * @param {string} response - Raw Gemini response
 * @returns {string} Cleaned response
 */
const cleanResponse = (response) => {
  return response
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/__(.*?)__/g, '$1') // Remove markdown underline
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\[.*?\]/g, match => match) // Keep format references
    .trim();
};

/**
 * Get or create user session
 * @param {string} userId - User ID
 * @returns {object} Chat session
 */
const getOrCreateSession = (userId) => {
  if (!activeSessions.has(userId)) {
    const model = getGeminiModel();
    activeSessions.set(userId, {
      model,
      history: [],
      createdAt: new Date(),
      messageCount: 0
    });
  }
  return activeSessions.get(userId);
};

/**
 * Clear user session
 * @param {string} userId - User ID
 */
const clearSession = (userId) => {
  activeSessions.delete(userId);
};

/**
 * Main chatbot function - processes query and generates response
 * @param {string} userInput - User's question
 * @param {string} userId - User ID for session management
 * @param {number} confidenceThreshold - Minimum confidence for Aloe Vera detection
 * @returns {Promise<object>} Chatbot response with metadata
 */
const chat = async (userInput, userId = 'anonymous', confidenceThreshold = 0.3) => {
  const startTime = Date.now();

  try {
    // Step 1: Validate input is Aloe Vera related
    const inputValidation = processUserInput(userInput, confidenceThreshold);

    if (!inputValidation.isValid) {
      return {
        success: true,
        message: generateFallbackResponse(userInput),
        confidence: inputValidation.classification ? inputValidation.classification.confidence : 0,
        isOffTopic: true,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Step 2: Get or create user session
    const session = getOrCreateSession(userId);
    session.messageCount++;

    // Step 3: Build context-aware prompt
    const systemPrompt = createSystemPrompt(userInput, inputValidation.classification);
    const locationContext = generateLocationContext(inputValidation.classification.detectedLocation);

    // Step 4: Call Gemini API
    const model = session.model;
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + locationContext }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
        topK: 40
      }
    });

    const generatedText = response.response.text();

    // Step 5: Validate response
    const responseValidation = validateResponse(generatedText, userInput);

    if (!responseValidation.isValid && responseValidation.hasInjectionPatterns) {
      console.warn('[SECURITY] Potential prompt injection detected:', userInput);
      return {
        success: false,
        message: 'Request could not be processed. Please refocus on Aloe Vera topics.',
        isSecurityIssue: true,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Step 6: Clean and format response
    const cleanedResponse = cleanResponse(generatedText);

    // Step 7: Store in session history
    session.history.push({
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    session.history.push({
      role: 'assistant',
      content: cleanedResponse,
      timestamp: new Date()
    });

    return {
      success: true,
      message: cleanedResponse,
      confidence: inputValidation.classification.confidence,
      detectedLocation: inputValidation.classification.detectedLocation,
      matchedCategories: inputValidation.classification.matchedCategories,
      isOffTopic: false,
      processingTime: Date.now() - startTime,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('[CHATBOT_ERROR]', error.message);

    return {
      success: false,
      message: 'Sorry, I encountered an error processing your query. Please try again.',
      error: error.message,
      errorType: error.constructor.name,
      processingTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }
};

/**
 * Multi-turn conversation support
 * @param {string} userInput - User's current message
 * @param {string} userId - User ID
 * @returns {Promise<object>} Response
 */
const chatWithHistory = async (userInput, userId) => {
  return chat(userInput, userId);
};

/**
 * Get session information
 * @param {string} userId - User ID
 * @returns {object} Session info
 */
const getSessionInfo = (userId) => {
  const session = activeSessions.get(userId);
  if (!session) return null;

  return {
    userId,
    messageCount: session.messageCount,
    createdAt: session.createdAt,
    historyLength: session.history.length,
    lastActive: session.lastActive || session.createdAt
  };
};

module.exports = {
  chat,
  chatWithHistory,
  getOrCreateSession,
  clearSession,
  getSessionInfo,
  processUserInput,
  validateResponse,
  cleanResponse,
  generateFallbackResponse,
  generateLocationContext,
  activeSessions
};
