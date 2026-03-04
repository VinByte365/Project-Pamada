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
            model_path = os.getenv('MODEL_PATH', 'models/AV3.pt')

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

    @staticmethod
    def _normalize_class_name(value):
        raw = str(value or '').strip().lower().replace('-', '_').replace(' ', '_')
        aliases = {
            'leaf_spots': 'leaf_spot',
            'leafspot': 'leaf_spot',
            'leafspots': 'leaf_spot',
            'sun_burn': 'sunburn',
            'rootrot': 'root_rot',
            'aloe_rusts': 'aloe_rust',
        }
        return aliases.get(raw, raw or 'unknown')

    def _get_model_class_names(self):
        names = getattr(self.model, 'names', None)
        if isinstance(names, dict):
            return [names[i] for i in sorted(names.keys())]
        if isinstance(names, (list, tuple)):
            return list(names)
        return []

    def _infer_class_names(self):
        model_names = self._get_model_class_names()
        if model_names:
            model_names = [self._normalize_class_name(item) for item in model_names]

        override = os.getenv('MODEL_CLASSES')
        if override:
            override_names = [self._normalize_class_name(item) for item in override.split(',') if item.strip()]
            if model_names and override_names != model_names:
                print(
                    'Warning: MODEL_CLASSES does not match model label order. '
                    'Using model labels to prevent class mismatch.'
                )
            elif override_names:
                return override_names

        if model_names:
            return model_names

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

    def predict(self, image, conf=0.25, iou=0.45, include_fallback=True):
        results = self.model(image, conf=conf, iou=iou)
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
                class_name = self._normalize_class_name(class_name)

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

        if include_fallback and not predictions:
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
