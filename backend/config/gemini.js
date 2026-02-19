/**
 * Google Gemini API Configuration
 * Handles initialization and configuration of Gemini API client
 */
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const defaultModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Initialize Gemini API lazily to avoid crashing when key is missing
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Get Gemini model instance
 * @param {string} modelName - Model name (default: gemini-pro)
 * @returns {object} Gemini model instance
 */
const getGeminiModel = (modelName = defaultModel) => {
  if (!genAI) {
    throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in backend/config/.env');
  }
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
