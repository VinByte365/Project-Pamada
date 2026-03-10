const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const connectToDatabase = require('./config/database');
const cloudinary = require('./config/cloudinary');
const errorHandler = require('./middlewares/errorHandler');
const requestContext = require('./middlewares/requestContext');
const notFound = require('./middlewares/notFound');
const chatbotRoutes = require('./routes/chatbot');
const { initSocket } = require('./socket');
const { seedPresetRecommendations } = require('./seeders/presetRecommendationSeeder');
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

// Connect to database
connectToDatabase();
if (String(process.env.AUTO_SEED_PRESET_RECOMMENDATIONS || 'false').toLowerCase() === 'true') {
  seedPresetRecommendations()
    .then(() => console.log('Preset recommendations seeded.'))
    .catch((error) => console.error('Preset recommendation seed failed:', error.message));
}
// Middleware
app.use(cors());
app.use(requestContext);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Apply rate limiting to all routes
const { apiLimiter } = require('./middlewares/rateLimiter');
app.use('/api/v1', apiLimiter);

// Routes - YoloV8
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/plants', require('./routes/plants'));
app.use('/api/v1/scans', require('./routes/scans'));
app.use('/api/v1/diseases', require('./routes/diseases'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/api/v1/settings', require('./routes/settings'));
app.use('/api/v1/community', require('./routes/community'));

// Routes - Aloe Vera Chatbot
app.use('/api/chatbot', chatbotRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Not found + error handler (must be last)
app.use(notFound);
app.use(errorHandler);

initSocket(server);
server.setTimeout(parseInt(process.env.SERVER_TIMEOUT_MS || '600000', 10));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
