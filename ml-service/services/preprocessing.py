from PIL import Image
import cv2
import numpy as np
from io import BytesIO

class ImagePreprocessor:
    def __init__(self):
        self.target_size = (640, 640)  # Standard YOLO input size
    
    def preprocess(self, image_file):
        """
        Preprocess image for inference
        
        Args:
            image_file: File object or image data
        
        Returns:
            Preprocessed image (numpy array)
        """
        try:
            # Read image
            if hasattr(image_file, 'read'):
                image = Image.open(BytesIO(image_file.read()))
            else:
                image = Image.open(image_file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Resize while maintaining aspect ratio
            image_array = self._resize_with_aspect_ratio(image_array)
            
            return image_array
            
        except Exception as e:
            raise ValueError(f"Error preprocessing image: {str(e)}")
    
    def _resize_with_aspect_ratio(self, image, target_size=None):
        """
        Resize image while maintaining aspect ratio
        """
        if target_size is None:
            target_size = self.target_size
        
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        # Calculate scaling factor
        scale = min(target_w / w, target_h / h)
        
        # Calculate new dimensions
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize image
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Pad to target size
        pad_w = (target_w - new_w) // 2
        pad_h = (target_h - new_h) // 2
        
        padded = cv2.copyMakeBorder(
            resized, pad_h, target_h - new_h - pad_h,
            pad_w, target_w - new_w - pad_w,
            cv2.BORDER_CONSTANT, value=[0, 0, 0]
        )
        
        return padded
    
    def extract_features(self, image):
        """
        Extract visual features from image
        
        Args:
            image: Preprocessed image (numpy array)
        
        Returns:
            Dictionary of visual features
        """
        try:
            # Convert to appropriate color space
            if len(image.shape) == 3:
                hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                hsv = image
                gray = image
            
            # Calculate color indices
            leaf_color_index = self._calculate_color_index(hsv)
            
            # Calculate surface pattern score
            surface_pattern_score = self._calculate_pattern_score(gray)
            
            # Estimate structural features
            structural_features = self._estimate_structure(image)
            
            return {
                'leaf_color_index': float(leaf_color_index),
                'surface_pattern_score': float(surface_pattern_score),
                'structural_features': structural_features
            }
            
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            return {
                'leaf_color_index': 0.5,
                'surface_pattern_score': 0.5,
                'structural_features': {
                    'thickness_estimate': 'medium',
                    'leaf_count_visible': 0
                }
            }
    
    def _calculate_color_index(self, hsv_image):
        """
        Calculate leaf color index (greenness/health indicator)
        """
        try:
            # Extract green channel (hue range for green: 40-80)
            lower_green = np.array([40, 50, 50])
            upper_green = np.array([80, 255, 255])
            
            mask = cv2.inRange(hsv_image, lower_green, upper_green)
            green_pixels = np.sum(mask > 0)
            total_pixels = hsv_image.shape[0] * hsv_image.shape[1]
            
            # Normalize to 0-1 range
            color_index = green_pixels / total_pixels if total_pixels > 0 else 0.5
            
            return min(max(color_index, 0), 1)
            
        except Exception as e:
            print(f"Error calculating color index: {str(e)}")
            return 0.5
    
    def _calculate_pattern_score(self, gray_image):
        """
        Calculate surface pattern score (texture analysis)
        """
        try:
            # Calculate variance (texture measure)
            variance = np.var(gray_image)
            
            # Normalize (assuming typical range)
            pattern_score = min(variance / 1000, 1.0)
            
            return pattern_score
            
        except Exception as e:
            print(f"Error calculating pattern score: {str(e)}")
            return 0.5
    
    def _estimate_structure(self, image):
        """
        Estimate structural features (thickness, leaf count)
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Edge detection for structure analysis
            edges = cv2.Canny(gray, 50, 150)
            
            # Estimate thickness based on edge density
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            
            if edge_density < 0.1:
                thickness = 'thin'
            elif edge_density < 0.3:
                thickness = 'medium'
            else:
                thickness = 'thick'
            
            # Simple leaf count estimation (contour-based)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            leaf_count = min(len(contours), 20)  # Cap at reasonable number
            
            return {
                'thickness_estimate': thickness,
                'leaf_count_visible': int(leaf_count)
            }
            
        except Exception as e:
            print(f"Error estimating structure: {str(e)}")
            return {
                'thickness_estimate': 'medium',
                'leaf_count_visible': 0
            }

