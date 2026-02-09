from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path
import os

class YOLOInference:
    def __init__(self, model_path=None):
        """
        Initialize YOLO model for disease detection
        """
        if model_path is None:
            # Default model path - will be set after training
            model_path = os.getenv('YOLO_MODEL_PATH', 'models/yolov8_aloe_vera.pt')
        
        # Check if model exists, otherwise use pretrained
        if os.path.exists(model_path):
            self.model = YOLO(model_path)
        else:
            # Use pretrained YOLOv8 model as fallback
            # In production, this should be replaced with trained model
            print(f"Warning: Model not found at {model_path}. Using pretrained model.")
            self.model = YOLO('yolov8n.pt')
        
        # Disease classes (matching the enum in scan model)
        self.disease_classes = [
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

