# Backend Environment Requirements

Set these values in `backend/config/.env`.

Required
- `PORT` - API server port (example: `8000`).
- `MONGO_URI` - MongoDB connection string for the app database.
- `JWT_SECRET` - Secret used to sign auth tokens.
- `CLOUDINARY_URL` - Cloudinary connection string for image uploads.
- `GEMINI_API_KEY` - Google Gemini API key for chatbot responses.
- `ML_SERVICE_URL` - URL for the YOLOv8 inference service (example: `http://localhost:5000`).

Recommended
- `JWT_EXPIRE` - Token TTL (example: `7d`).
- `CORS_ORIGIN` - Comma-separated list of allowed origins (example: `http://localhost:3000,http://localhost:5173`).
- `GEMINI_MODEL` - Gemini model name override (default: `GEMINI_MODEL`).
- `ML_SERVICE_TIMEOUT` - Timeout in ms for ML calls (default: `30000`).
- `NODE_ENV` - `development` or `production`.
