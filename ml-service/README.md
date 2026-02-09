# ML Inference Service

Flask-based service for running ML inference on Aloe Vera plant images.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (copy .env.example to .env)

3. Run the service:
```bash
python app.py
```

## Endpoints

- `GET /health` - Health check
- `POST /predict` - Single image prediction
- `POST /predict/batch` - Batch image prediction

## Usage

The service will be available at `http://localhost:5000` by default.

