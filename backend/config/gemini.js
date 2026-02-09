/**
 * Google Gemini API Configuration
 * Handles initialization and configuration of Gemini API client
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Get Gemini model instance
 * @param {string} modelName - Model name (default: gemini-pro)
 * @returns {object} Gemini model instance
 */
const getGeminiModel = (modelName = 'gemini-pro') => {
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Gemini chat session factory
 * Creates a new chat session for multi-turn conversations
 * @returns {object} Chat session
 */
const createChatSession = () => {
  const model = getGeminiModel();
  return model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
    },
  });
};

module.exports = {
  getGeminiModel,
  createChatSession,
  genAI,
};
