import os
from pathlib import Path

import torch
from ultralytics import YOLO


class YOLOService:
    def __init__(self, model_path=None):
        self.model_path = self._resolve_model_path(model_path)
        self._configure_torch_loading()

        if not Path(self.model_path).exists():
            raise FileNotFoundError(f"YOLO model not found at: {self.model_path}")

        self.model = YOLO(self.model_path)
        self.model_name = Path(self.model_path).name
        self.class_names = self._infer_class_names()

    def _resolve_model_path(self, model_path):
        if model_path is None:
            model_path = os.getenv('MODEL_PATH', 'models/AV1.pt')

        path = Path(model_path)
        if path.is_absolute():
            return str(path)

        service_root = Path(__file__).resolve().parents[1]
        return str(service_root / path)

    def _configure_torch_loading(self):
        trusted = os.getenv('TRUSTED_MODEL', 'true').lower() == 'true'
        if trusted:
            self._patch_torch_load(weights_only=False)

    def _patch_torch_load(self, weights_only=False):
        if getattr(torch.load, '__aloevera_patched__', False):
            return

        original_load = torch.load

        def load_wrapper(*args, **kwargs):
            if 'weights_only' not in kwargs:
                kwargs['weights_only'] = weights_only
            return original_load(*args, **kwargs)

        load_wrapper.__aloevera_patched__ = True
        torch.load = load_wrapper

    def _infer_class_names(self):
        override = os.getenv('MODEL_CLASSES')
        if override:
            return [item.strip() for item in override.split(',') if item.strip()]

        names = getattr(self.model, 'names', None)
        if isinstance(names, dict):
            return [names[i] for i in sorted(names.keys())]
        if isinstance(names, (list, tuple)):
            return list(names)
        return [
            'healthy',
            'leaf_spot',
            'root_rot',
            'sunburn',
            'aloe_rust',
            'bacterial_soft_rot',
            'anthracnose',
            'scale_insect',
            'mealybug',
            'spider_mite'
        ]

    def predict(self, image):
        results = self.model(image, conf=0.25, iou=0.45)
        predictions = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())

                if class_id < len(self.class_names):
                    class_name = self.class_names[class_id]
                else:
                    class_name = 'unknown'

                predictions.append({
                    'class': class_name,
                    'confidence': confidence,
                    'bounding_box': {
                        'x': float(x1),
                        'y': float(y1),
                        'width': float(x2 - x1),
                        'height': float(y2 - y1)
                    }
                })

        if not predictions:
            predictions.append({
                'class': 'healthy',
                'confidence': 0.5,
                'bounding_box': {
                    'x': 0.0,
                    'y': 0.0,
                    'width': 0.0,
                    'height': 0.0
                }
            })

        predictions.sort(key=lambda item: item['confidence'], reverse=True)
        return predictions
