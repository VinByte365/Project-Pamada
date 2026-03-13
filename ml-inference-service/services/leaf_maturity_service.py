import base64
import os
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from services.yolo_service import YOLOService


class LeafMaturityService:
    def __init__(self, model_path=None):
        self.model_path = model_path or os.getenv('AGE_MODEL_PATH', 'models/ageV3.pt')
        self.yolo = YOLOService(self.model_path)
        self.default_threshold = float(os.getenv('LEAF_CONFIDENCE_THRESHOLD', '0.5'))
        self.expected_leaf_class = self._normalize(os.getenv('LEAF_CLASS_NAME', 'leaf'))
        self.model_leaf_class = self._resolve_model_leaf_class()

    @staticmethod
    def _normalize(value):
        return str(value or '').strip().lower().replace('-', '_').replace(' ', '_')

    def _resolve_model_leaf_class(self):
        model_classes = [self._normalize(name) for name in self.yolo.class_names if str(name).strip()]
        if not model_classes:
            return self.expected_leaf_class

        if len(model_classes) != 1:
            raise ValueError(
                f'AGE model must be single-class (leaf). Found {len(model_classes)} classes: {model_classes}'
            )

        return model_classes[0]

    @staticmethod
    def classify_maturity(leaf_count):
        if leaf_count <= 6:
            return 'Young / Not Ready'
        if leaf_count <= 11:
            return 'Developing / Almost Ready'
        return 'Mature / Ready for Harvest'

    @staticmethod
    def _draw_boxes(image_rgb, detections):
        annotated = image_rgb.copy()
        for idx, det in enumerate(detections, start=1):
            bbox = det['bounding_box']
            x = int(bbox['x'])
            y = int(bbox['y'])
            w = int(bbox['width'])
            h = int(bbox['height'])
            x2 = x + w
            y2 = y + h

            cv2.rectangle(annotated, (x, y), (x2, y2), (34, 197, 94), 2)
            label = f"Leaf {idx} {det['confidence']:.2f}"
            cv2.putText(
                annotated,
                label,
                (x, max(16, y - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.48,
                (34, 197, 94),
                1,
                cv2.LINE_AA,
            )
        return annotated

    @staticmethod
    def _to_base64_jpeg(image_rgb):
        pil_image = Image.fromarray(image_rgb.astype(np.uint8))
        buffer = BytesIO()
        pil_image.save(buffer, format='JPEG', quality=90)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def detect_leaves(self, image_rgb, confidence_threshold=None):
        """Return leaf detections and maturity data without drawing annotations."""
        threshold = self.default_threshold if confidence_threshold is None else float(confidence_threshold)
        raw_predictions = self.yolo.predict(image_rgb, conf=threshold, iou=0.45, include_fallback=False)
        leaf_detections = [
            pred for pred in raw_predictions
            if pred['confidence'] >= threshold and self._normalize(pred['class']) == self.model_leaf_class
        ]
        leaf_count = len(leaf_detections)
        return {
            'leaf_count': leaf_count,
            'maturity_stage': self.classify_maturity(leaf_count),
            'detections': leaf_detections,
        }

    def analyze(self, image_rgb, confidence_threshold=None):
        threshold = self.default_threshold if confidence_threshold is None else float(confidence_threshold)
        raw_predictions = self.yolo.predict(
            image_rgb,
            conf=threshold,
            iou=0.45,
            include_fallback=False,
        )

        leaf_detections = [
            pred for pred in raw_predictions
            if pred['confidence'] >= threshold and self._normalize(pred['class']) == self.model_leaf_class
        ]
        leaf_count = len(leaf_detections)
        maturity_stage = self.classify_maturity(leaf_count)
        annotated = self._draw_boxes(image_rgb, leaf_detections)

        return {
            'plant_detected': leaf_count > 0,
            'leaf_count': leaf_count,
            'maturity_stage': maturity_stage,
            'confidence_threshold': threshold,
            'detections': leaf_detections,
            'annotated_image_base64': self._to_base64_jpeg(annotated),
        }
