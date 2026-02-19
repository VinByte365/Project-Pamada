from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import time

from services.yolo_service import YOLOService
from services.preprocessing import ImagePreprocessor
from services.age_estimation import AgeEstimator
from utils.image_utils import validate_image
from utils.metrics import calculate_confidence_score

load_dotenv()

app = Flask(__name__)

# Initialize services
model_service = YOLOService()
preprocessor = ImagePreprocessor()
age_estimator = AgeEstimator()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Aloe Vera ML Inference Service',
        'model_path': model_service.model_path,
        'model_name': model_service.model_name,
        'class_count': len(model_service.class_names),
        'version': os.getenv('SERVICE_VERSION', '1.0.0')
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()

    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'}), 400

        image_file = request.files['image']
        validation = validate_image(image_file)
        if not validation['valid']:
            return jsonify({'success': False, 'error': validation['error']}), 400

        # Read bytes once to avoid re-reading the stream.
        image_bytes = image_file.read()
        image = preprocessor.preprocess(image_bytes)

        yolo_predictions = model_service.predict(image)
        visual_features = preprocessor.extract_features(image)
        age_estimation = age_estimator.estimate(visual_features)
        confidence_score = calculate_confidence_score(yolo_predictions, visual_features)

        processing_time = (time.time() - start_time) * 1000

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

    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        if 'images' not in request.files:
            return jsonify({'success': False, 'error': 'No image files provided'}), 400

        images = request.files.getlist('images')
        results = []

        for image_file in images:
            try:
                validation = validate_image(image_file)
                if not validation['valid']:
                    results.append({
                        'filename': image_file.filename,
                        'success': False,
                        'error': validation['error']
                    })
                    continue

                image_bytes = image_file.read()
                image = preprocessor.preprocess(image_bytes)

                yolo_predictions = model_service.predict(image)
                visual_features = preprocessor.extract_features(image)
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
            except Exception as exc:
                results.append({
                    'filename': image_file.filename,
                    'success': False,
                    'error': str(exc)
                })

        return jsonify({
            'success': True,
            'count': len(results),
            'data': {'results': results}
        }), 200

    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5001'))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
