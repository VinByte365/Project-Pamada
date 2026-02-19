# Aloe Vera ML Inference Service

## What it does
Provides `/health`, `/predict`, and `/predict/batch` endpoints for Aloe Vera disease detection using your `AV1.pt` model.

## Setup
1. Create a venv and install deps:
   ```bash
   pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and adjust if needed.
3. Run:
   ```bash
   python app.py
   ```

## API
- `GET /health`
- `POST /predict` (multipart field name: `image`)
- `POST /predict/batch` (multipart field name: `images`)

## Environment
- `MODEL_PATH` defaults to `models/AV1.pt`
- `PORT` defaults to `5001`
- `TRUSTED_MODEL=true` loads the model with `weights_only=False` (safe if you trust the checkpoint)
- `MODEL_CLASSES` optional comma-separated override for class labels
