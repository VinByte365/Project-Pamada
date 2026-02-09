from PIL import Image
from io import BytesIO
import numpy as np

def validate_image(image_file):
    """
    Validate uploaded image
    
    Args:
        image_file: File object
    
    Returns:
        Dictionary with validation result
    """
    try:
        # Check if file exists
        if not image_file:
            return {'valid': False, 'error': 'No file provided'}
        
        # Check file size (max 10MB)
        image_file.seek(0, 2)  # Seek to end
        file_size = image_file.tell()
        image_file.seek(0)  # Reset to beginning
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            return {'valid': False, 'error': 'File size exceeds 10MB limit'}
        
        # Try to open as image
        try:
            image = Image.open(BytesIO(image_file.read()))
            image_file.seek(0)  # Reset for actual processing
            
            # Check format
            if image.format not in ['JPEG', 'PNG', 'JPG', 'WEBP']:
                return {'valid': False, 'error': f'Unsupported image format: {image.format}'}
            
            # Check dimensions
            width, height = image.size
            if width < 100 or height < 100:
                return {'valid': False, 'error': 'Image dimensions too small (minimum 100x100)'}
            
            if width > 5000 or height > 5000:
                return {'valid': False, 'error': 'Image dimensions too large (maximum 5000x5000)'}
            
            return {'valid': True}
            
        except Exception as e:
            return {'valid': False, 'error': f'Invalid image file: {str(e)}'}
            
    except Exception as e:
        return {'valid': False, 'error': f'Error validating image: {str(e)}'}

def calculate_confidence_score(yolo_predictions, visual_features):
    """
    Calculate overall confidence score for the analysis
    
    Args:
        yolo_predictions: List of YOLO predictions
        visual_features: Dictionary of visual features
    
    Returns:
        Confidence score (0-1)
    """
    try:
        # Base confidence from YOLO predictions
        if yolo_predictions:
            max_confidence = max([pred.get('confidence', 0) for pred in yolo_predictions])
        else:
            max_confidence = 0.5
        
        # Adjust based on visual features quality
        color_index = visual_features.get('leaf_color_index', 0.5)
        pattern_score = visual_features.get('surface_pattern_score', 0.5)
        
        # Feature quality factor
        feature_quality = (color_index + pattern_score) / 2
        
        # Combined confidence
        confidence = (max_confidence * 0.7) + (feature_quality * 0.3)
        
        return min(max(confidence, 0), 1)
        
    except Exception as e:
        print(f"Error calculating confidence: {str(e)}")
        return 0.5

