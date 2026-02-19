from ultralytics import YOLO
import torch
import ultralytics.nn.tasks as ul_tasks
import ultralytics.nn.modules.conv as ul_conv
import torch.nn as nn
import cv2
import numpy as np
from pathlib import Path
import os

class YOLOInference:
    def __init__(self, model_path=None):
        """
        Initialize YOLO model for disease detection
        """
        # PyTorch 2.6+ defaults to weights_only=True; allowlist classes used by Ultralytics checkpoints.
        try:
            torch.serialization.add_safe_globals([
                ul_tasks.DetectionModel,
                ul_conv.Conv,
                nn.Sequential,
                nn.ModuleList,
                nn.Conv2d,
                nn.BatchNorm2d,
                nn.SiLU,
                nn.ReLU,
                nn.MaxPool2d,
                nn.Upsample,
                nn.Identity,
            ])
        except Exception:
            # Older torch versions or different APIs will ignore this.
            pass
        service_root = Path(__file__).resolve().parents[1]

        if model_path is None:
            # Prefer the trained disease model by default.
            model_path = os.getenv('YOLO_MODEL_PATH', 'AV1.pt')

        selected_path = self._resolve_model_path(model_path, service_root)
        if selected_path is None:
            # Final fallback to bundled yolov8n.pt if available.
            fallback = service_root / 'yolov8n.pt'
            if fallback.exists():
                print(
                    f"Warning: Model not found at {model_path}. "
                    f"Falling back to {fallback}."
                )
                selected_path = fallback
            else:
                raise FileNotFoundError(
                    f"YOLO model not found. Tried {model_path} "
                    f"and fallback {fallback}."
                )

        self.model = YOLO(str(selected_path))

        # Disease classes (matching the enum in scan model)
        self.disease_classes = self._infer_class_names()

    def _resolve_model_path(self, model_path, service_root):
        path = Path(model_path)
        if path.is_absolute():
            return path if path.exists() else None

        # Resolve relative paths against the ml-service root.
        candidate = service_root / path
        return candidate if candidate.exists() else None

    def _infer_class_names(self):
        try:
            names = getattr(self.model, 'names', None)
            if isinstance(names, dict) and names:
                return [names[i] for i in sorted(names.keys())]
            if isinstance(names, (list, tuple)) and names:
                return list(names)
        except Exception:
            pass
        return [
            'healthy', 'leaf_spot', 'root_rot', 'sunburn', 'aloe_rust',
            'bacterial_soft_rot', 'anthracnose', 'scale_insect',
            'mealybug', 'spider_mite'
        ]
    
    def predict(self, image):
        """
        Run YOLO inference on image
        
        Args:
            image: Preprocessed image (numpy array or PIL Image)
        
        Returns:
            List of predictions with bounding boxes and confidence scores
        """
        try:
            # Run inference
            results = self.model(image, conf=0.25, iou=0.45)
            
            predictions = []
            
            for result in results:
                boxes = result.boxes
                
                for i in range(len(boxes)):
                    box = boxes[i]
                    
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Get confidence and class
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    # Map class ID to disease name
                    # Note: This assumes the model was trained with these classes
                    # In production, ensure model classes match self.disease_classes
                    if class_id < len(self.disease_classes):
                        class_name = self.disease_classes[class_id]
                    else:
                        class_name = 'healthy'  # Default fallback
                    
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
            
            # If no predictions, assume healthy
            if not predictions:
                predictions.append({
                    'class': 'healthy',
                    'confidence': 0.5,
                    'bounding_box': {
                        'x': 0,
                        'y': 0,
                        'width': 0,
                        'height': 0
                    }
                })
            
            return predictions
            
        except Exception as e:
            print(f"Error in YOLO inference: {str(e)}")
            # Return default healthy prediction on error
            return [{
                'class': 'healthy',
                'confidence': 0.3,
                'bounding_box': {
                    'x': 0,
                    'y': 0,
                    'width': 0,
                    'height': 0
                }
            }]

