# Aloe Vera ML Inference Service

## What it does
Provides `/health`, `/predict`, `/predict/batch`, and `/predict/maturity` endpoints for Aloe Vera analysis.

## Setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   ```
2. Install deps from inside the venv:
   ```bash
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and adjust if needed.
4. Run from inside the venv:
   ```bash
   python app.py
   ```

## NumPy compatibility note
If you see errors like `A module that was compiled using NumPy 1.x cannot be run in NumPy 2.x`, you are likely using global Python packages instead of this service's `.venv`.

Verify with:
```bash
python -c "import sys, numpy; print(sys.executable); print(numpy.__version__)"
```
Expected:
- executable path includes `ml-inference-service\.venv\`
- NumPy version is `1.24.3`

## API
- `GET /health`
- `POST /predict` (multipart field name: `image`)
- `POST /predict/batch` (multipart field name: `images`)
- `POST /predict/maturity` (multipart field name: `image`)
  - Uses `models/ageV1.pt` by default
  - Expects a single-class leaf model (class: `leaf`)
  - Counts detected leaf objects above confidence threshold
  - Returns:
    - `leaf_count`
    - `maturity_stage`
    - `confidence_threshold`
    - `detections` (bounding boxes and confidence)
    - `annotated_image_base64`

## Environment
- `MODEL_PATH` defaults to `models/AV1.pt`
- `AGE_MODEL_PATH` defaults to `models/ageV1.pt`
- `PORT` defaults to `5001`
- `TRUSTED_MODEL=true` loads the model with `weights_only=False` (safe if you trust the checkpoint)
- `MODEL_CLASSES` optional comma-separated override for class labels. Leave unset unless it exactly matches your model class order.
- `LEAF_CONFIDENCE_THRESHOLD` defaults to `0.5`
- `LEAF_CLASS_NAME` defaults to `leaf`
