/**
 * Topic Classification Service
 * Detects if user queries are Aloe Vera related using keyword and semantic matching
 */

// Comprehensive Aloe Vera keywords database
const ALOE_VERA_KEYWORDS = {
  general: [
    'aloe vera', 'aloe', 'aloe plant', 'aloe gel', 'aloe juice',
    'succulent', 'liliaceae', 'aloe barbadensis'
  ],
  cultivation: [
    'grow', 'growing', 'cultivation', 'plant', 'seed', 'propagate',
    'propagation', 'soil', 'pot', 'transplant', 'nursery', 'farm',
    'farming', 'plantation', 'climate', 'temperature', 'humidity'
  ],
  care: [
    'water', 'watering', 'irrigation', 'fertilizer', 'nutrients',
    'sunlight', 'light', 'shade', 'prune', 'pruning', 'maintenance',
    'care', 'health', 'rootbound'
  ],
  diseases: [
    'disease', 'pest', 'infection', 'fungal', 'bacterial', 'rot',
    'leaf rot', 'brown spots', 'yellowing', 'pest management',
    'pest control', 'blight', 'scale', 'mealybug'
  ],
  harvesting: [
    'harvest', 'harvesting', 'extract', 'extraction', 'cut',
    'storage', 'store', 'preserve', 'processing', 'process',
    'yield', 'maturity', 'mature'
  ],
  products: [
    'product', 'cosmetic', 'medicine', 'supplement', 'topical',
    'skincare', 'benefit', 'use', 'application', 'gel extraction',
    'latex', 'drink', 'beverage'
  ],
  location: [
    'farm', 'location', 'region', 'area', 'where', 'cultivation area',
    'growing region', 'suitable', 'best place', 'country', 'state',
    'city', 'near', 'proximity', 'distance', 'plantation'
  ]
};

/**
 * Normalize user input
 * @param {string} input - Raw user input
 * @returns {string} Normalized input
 */
const normalizeInput = (input) => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Keyword-based topic detection
 * @param {string} input - Normalized user input
 * @returns {object} Detection result with score and categories
 */
const performKeywordMatching = (input) => {
  const words = input.split(' ');
  const matchedCategories = {};
  let score = 0;

  Object.entries(ALOE_VERA_KEYWORDS).forEach(([category, keywords]) => {
    const matches = words.filter(word =>
      keywords.some(keyword => keyword.includes(word) || word.includes(keyword))
    );

    if (matches.length > 0) {
      matchedCategories[category] = matches.length;
      score += matches.length * 2; // Weight keyword matches
    }
  });

  return {
    score,
    categories: matchedCategories,
    confidence: Math.min(score / 10, 1) // Normalize confidence
  };
};

/**
 * Extract location from user input
 * @param {string} input - User input
 * @returns {string|null} Extracted location name
 */
const extractLocation = (input) => {
  const locationPatterns = [
    /(?:near|in|around|at|from)\s+([a-zA-Z\s]+?)(?:\?|$)/i,
    /(?:farms?|areas?|regions?)\s+(?:in|at|of)\s+([a-zA-Z\s]+?)(?:\?|$)/i,
    /([a-zA-Z]+)\s+(?:region|area|location|city|country)/i
  ];

  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Classify if query is Aloe Vera related
 * @param {string} userInput - Raw user input
 * @param {number} confidenceThreshold - Minimum confidence (0-1)
 * @returns {object} Classification result
 */
const classifyQuery = (userInput, confidenceThreshold = 0.3) => {
  const normalized = normalizeInput(userInput);
  const keywordResult = performKeywordMatching(normalized);
  const location = extractLocation(userInput);

  const isAloeVeraRelated = keywordResult.confidence >= confidenceThreshold ||
    keywordResult.score > 0; // Allow some queries with low keyword match

  return {
    isAloeVeraRelated,
    confidence: keywordResult.confidence,
    matchedCategories: keywordResult.categories,
    score: keywordResult.score,
    detectedLocation: location,
    normalized,
    timestamp: new Date()
  };
};

/**
 * Create enhanced system prompt for Gemini
 * @param {string} userQuery - Original user query
 * @param {object} classification - Classification result
 * @returns {string} System prompt
 */
const createSystemPrompt = (userQuery, classification) => {
  const locationContext = classification.detectedLocation
    ? `\nUser is asking about location: ${classification.detectedLocation}`
    : '';

  return `You are an expert Aloe Vera specialist chatbot. Your ONLY purpose is to answer questions exclusively about:
- Aloe Vera cultivation, growth, and propagation
- Soil, water, nutrients, and irrigation
- Diseases, pests, and pest management
- Harvesting, storage, and processing
- Aloe Vera products and health benefits
- Best practices in Aloe farming
- Aloe Vera farm locations and suitable growing regions

IMPORTANT RULES:
1. ONLY answer questions related to Aloe Vera
2. If a question is not about Aloe Vera, politely decline with: "I'm specialized in Aloe Vera topics. Your question doesn't seem to be about Aloe Vera. Could you ask something about Aloe cultivation, care, diseases, harvesting, or locations?"
3. Do not attempt to answer questions about other plants, animals, politics, programming, math, entertainment, or unrelated topics
4. Be concise and educational in your responses
5. For location queries, provide practical information about climate suitability
6. Warn about common misconceptions
7. Provide scientifically accurate information${locationContext}

User Query: "${userQuery}"`;
};

/**
 * Log filtered query for monitoring
 * @param {object} logData - Data to log
 */
const logFilteredQuery = (logData) => {
  console.log('[CHATBOT_CLASSIFICATION]', {
    timestamp: new Date().toISOString(),
    userInput: logData.normalized,
    isAloeVeraRelated: logData.isAloeVeraRelated,
    confidence: logData.confidence,
    categories: logData.matchedCategories,
    location: logData.detectedLocation,
    reason: logData.reason
  });
};

module.exports = {
  classifyQuery,
  normalizeInput,
  extractLocation,
  performKeywordMatching,
  createSystemPrompt,
  logFilteredQuery,
  ALOE_VERA_KEYWORDS
};
