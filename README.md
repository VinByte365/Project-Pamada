# Aloe Vera Harvest Readiness Assessment System

Machine Learning-Driven Aloe Vera Harvest Readiness Assessment Based on Plant Age Estimation and Visual Disease Analysis.

## System Architecture

The system consists of:
- **Backend API** (Node.js/Express) - Main application server
- **ML Inference Service** (Python/Flask) - YOLO model for disease detection
- **ML Training Pipeline** (Python) - Model training and retraining
- **Mobile App** (React Native/Expo) - User-facing application
- **Web Admin** (React/Vite) - Admin dashboard

## Prerequisites

- Node.js 18+
- Python 3.8+
- MongoDB
- Cloudinary account (for image storage)

## Setup

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in `backend/config/`:
```
PORT=8000
MONGO_URI=mongodb://localhost:27017/aloe-vera
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
CLOUDINARY_URL=your-cloudinary-url
ML_SERVICE_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

4. Start server:
```bash
npm start
```

### ML Inference Service

1. Navigate to ml-service directory:
```bash
cd ml-service
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```
PORT=5000
FLASK_DEBUG=False
YOLO_MODEL_PATH=models/yolov8_aloe_vera.pt
```

4. Start service:
```bash
python app.py
```

### ML Training Pipeline

1. Navigate to ml-training directory:
```bash
cd ml-training
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Prepare dataset:
```bash
python data_preprocessing.py
```

4. Train model:
```bash
python train.py --epochs 100
```

### Mobile App

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `mobile/services/api.js`

4. Start app:
```bash
npm start
```

### Web Admin

1. Navigate to web-admin directory:
```bash
cd web-admin
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `web-admin/src/services/api.js`

4. Start dev server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/updatedetails` - Update user details
- `PUT /api/v1/auth/updatepassword` - Update password
- `POST /api/v1/auth/logout` - Logout

### Plants
- `GET /api/v1/plants` - Get all plants
- `GET /api/v1/plants/:id` - Get single plant
- `POST /api/v1/plants` - Create plant
- `PUT /api/v1/plants/:id` - Update plant
- `DELETE /api/v1/plants/:id` - Delete plant

### Scans
- `GET /api/v1/scans` - Get all scans
- `GET /api/v1/scans/:id` - Get single scan
- `POST /api/v1/scans` - Create scan (with image upload)
- `PUT /api/v1/scans/:id` - Update scan
- `DELETE /api/v1/scans/:id` - Delete scan

### Diseases
- `GET /api/v1/diseases` - Get all diseases
- `GET /api/v1/diseases/:id` - Get single disease
- `GET /api/v1/diseases/:name/treatment` - Get treatment recommendations

### Analytics
- `GET /api/v1/analytics` - Get analytics
- `GET /api/v1/analytics/daily` - Get daily analytics
- `GET /api/v1/analytics/weekly` - Get weekly analytics
- `GET /api/v1/analytics/monthly` - Get monthly analytics
- `GET /api/v1/analytics/summary` - Get summary statistics

### Training Dataset (Admin only)
- `GET /api/v1/training` - Get training dataset
- `GET /api/v1/training/pending` - Get pending validations
- `PUT /api/v1/training/:id/validate` - Validate entry
- `PUT /api/v1/training/:id/reject` - Reject entry
- `POST /api/v1/training/export` - Export batch
- `GET /api/v1/training/stats` - Get training statistics

## Features

- Plant management and tracking
- Image-based disease detection using YOLOv8
- Plant age estimation
- Harvest readiness assessment
- Analytics and reporting
- Training dataset management
- Continuous learning pipeline

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Role-based access control

## License

ISC

