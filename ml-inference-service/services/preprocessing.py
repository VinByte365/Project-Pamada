from PIL import Image
import cv2
import numpy as np
from io import BytesIO


class ImagePreprocessor:
    def __init__(self):
        self.target_size = (640, 640)

    def preprocess(self, image_bytes):
        try:
            image = Image.open(BytesIO(image_bytes))
            if image.mode != 'RGB':
                image = image.convert('RGB')

            image_array = np.array(image)
            image_array = self._resize_with_aspect_ratio(image_array)
            return image_array
        except Exception as exc:
            raise ValueError(f"Error preprocessing image: {exc}")

    def _resize_with_aspect_ratio(self, image, target_size=None):
        if target_size is None:
            target_size = self.target_size

        h, w = image.shape[:2]
        target_w, target_h = target_size
        scale = min(target_w / w, target_h / h)
        new_w = int(w * scale)
        new_h = int(h * scale)

        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        pad_w = (target_w - new_w) // 2
        pad_h = (target_h - new_h) // 2

        padded = cv2.copyMakeBorder(
            resized,
            pad_h,
            target_h - new_h - pad_h,
            pad_w,
            target_w - new_w - pad_w,
            cv2.BORDER_CONSTANT,
            value=[0, 0, 0]
        )

        return padded

    def extract_features(self, image):
        try:
            if len(image.shape) == 3:
                hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                hsv = image
                gray = image

            leaf_color_index = self._calculate_color_index(hsv)
            surface_pattern_score = self._calculate_pattern_score(gray)
            structural_features = self._estimate_structure(image)

            return {
                'leaf_color_index': float(leaf_color_index),
                'surface_pattern_score': float(surface_pattern_score),
                'structural_features': structural_features
            }
        except Exception:
            return {
                'leaf_color_index': 0.5,
                'surface_pattern_score': 0.5,
                'structural_features': {
                    'thickness_estimate': 'medium',
                    'leaf_count_visible': 0
                }
            }

    def _calculate_color_index(self, hsv_image):
        lower_green = np.array([40, 50, 50])
        upper_green = np.array([80, 255, 255])
        mask = cv2.inRange(hsv_image, lower_green, upper_green)
        green_pixels = np.sum(mask > 0)
        total_pixels = hsv_image.shape[0] * hsv_image.shape[1]
        color_index = green_pixels / total_pixels if total_pixels > 0 else 0.5
        return min(max(color_index, 0), 1)

    def _calculate_pattern_score(self, gray_image):
        variance = np.var(gray_image)
        pattern_score = min(variance / 1000, 1.0)
        return pattern_score

    def _estimate_structure(self, image):
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image

            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])

            if edge_density < 0.1:
                thickness = 'thin'
            elif edge_density < 0.3:
                thickness = 'medium'
            else:
                thickness = 'thick'

            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            leaf_count = min(len(contours), 20)

            return {
                'thickness_estimate': thickness,
                'leaf_count_visible': int(leaf_count)
            }
        except Exception:
            return {
                'thickness_estimate': 'medium',
                'leaf_count_visible': 0
            }
