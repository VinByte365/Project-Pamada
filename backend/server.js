const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectToDatabase = require('./config/database');
const cloudinary = require('./config/cloudinary');
const errorHandler = require('./middlewares/errorHandler');
const chatbotRoutes = require('./routes/chatbot');
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to database
connectToDatabase();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
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
app.use('/api/v1/training', require('./routes/training'));

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

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () =>{
console.log(`Server running on port ${PORT}`)
});             