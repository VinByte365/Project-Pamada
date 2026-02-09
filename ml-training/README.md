# ML Training Pipeline

Training infrastructure for YOLO model on Aloe Vera disease detection.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (MONGO_URI, etc.)

3. Prepare dataset:
```bash
python data_preprocessing.py
```

4. Train model:
```bash
python train.py --epochs 100 --batch 16
```

5. Evaluate model:
```bash
python evaluate.py --model runs/detect/aloe_vera_training/weights/best.pt
```

6. Retrain (automated):
```bash
python retrain.py
```

## Directory Structure

- `dataset/` - Prepared training dataset
- `runs/` - Training runs and results
- `models/` - Deployed models

