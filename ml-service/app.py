from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import time
from services.yolo_inference import YOLOInference
from services.age_estimation import AgeEstimator
from services.preprocessing import ImagePreprocessor
from utils.helpers import validate_image, calculate_confidence_score

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize services
yolo_inference = YOLOInference()
age_estimator = AgeEstimator()
image_preprocessor = ImagePreprocessor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'ML Inference Service',
        'version': '1.0.0'
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    
    try:
        # Check if image is present
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400

        image_file = request.files['image']
        
        # Validate image
        validation_result = validate_image(image_file)
        if not validation_result['valid']:
            return jsonify({
                'success': False,
                'error': validation_result['error']
            }), 400

        # Preprocess image
        processed_image = image_preprocessor.preprocess(image_file)
        
        # Run YOLO inference for disease detection
        yolo_predictions = yolo_inference.predict(processed_image)
        
        # Extract visual features
        visual_features = image_preprocessor.extract_features(processed_image)
        
        # Estimate age based on visual features
        age_estimation = age_estimator.estimate(visual_features)
        
        # Calculate overall confidence
        confidence_score = calculate_confidence_score(yolo_predictions, visual_features)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        return jsonify({
            'success': True,
            'data': {
                'yolo_predictions': yolo_predictions,
                'visual_features': visual_features,
                'age_estimation': age_estimation,
                'confidence_score': confidence_score,
                'processing_time_ms': processing_time
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        if 'images' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image files provided'
            }), 400

        images = request.files.getlist('images')
        results = []

        for image_file in images:
            try:
                validation_result = validate_image(image_file)
                if not validation_result['valid']:
                    results.append({
                        'filename': image_file.filename,
                        'success': False,
                        'error': validation_result['error']
                    })
                    continue

                processed_image = image_preprocessor.preprocess(image_file)
                yolo_predictions = yolo_inference.predict(processed_image)
                visual_features = image_preprocessor.extract_features(processed_image)
                age_estimation = age_estimator.estimate(visual_features)
                confidence_score = calculate_confidence_score(yolo_predictions, visual_features)

                results.append({
                    'filename': image_file.filename,
                    'success': True,
                    'data': {
                        'yolo_predictions': yolo_predictions,
                        'visual_features': visual_features,
                        'age_estimation': age_estimation,
                        'confidence_score': confidence_score
                    }
                })
            except Exception as e:
                results.append({
                    'filename': image_file.filename,
                    'success': False,
                    'error': str(e)
                })

        return jsonify({
            'success': True,
            'count': len(results),
            'data': {
                'results': results
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')

