import * as ImageManipulator from 'expo-image-manipulator';
import { apiRequest } from '../utils/api';

let modelLoaded = false;

const aloeRelatedClasses = new Set([
  'healthy',
  'leaf_spot',
  'root_rot',
  'sunburn',
  'aloe_rust',
  'bacterial_soft_rot',
  'anthracnose',
  'scale_insect',
  'mealybug',
  'spider_mite',
]);

export async function initializeLiveDetectionModel() {
  // Live imaging uses backend ML inference API for now.
  modelLoaded = true;
  return { ready: modelLoaded, error: '' };
}

export async function preprocessFrame(uri) {
  const processed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 640, height: 640 } }],
    { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG }
  );
  return processed;
}

export async function runLiveDetection(imageUri, token) {
  const processed = await preprocessFrame(imageUri);

  const formData = new FormData();
  formData.append('image', {
    uri: processed.uri,
    name: `live-${Date.now()}.jpg`,
    type: 'image/jpeg',
  });

  const response = await apiRequest('/api/v1/scans/live-detect', {
    method: 'POST',
    token,
    body: formData,
  });

  const payload = response?.data || {};
  const predictions = payload.yolo_predictions || [];

  const mapped = predictions
    .filter((pred) => aloeRelatedClasses.has(pred.class))
    .map((pred) => ({
      label: pred.class,
      confidence: Number(pred.confidence || 0),
      bbox: {
        xRatio: processed.width ? Number(pred?.bounding_box?.x || 0) / processed.width : 0,
        yRatio: processed.height ? Number(pred?.bounding_box?.y || 0) / processed.height : 0,
        wRatio: processed.width ? Number(pred?.bounding_box?.width || 0) / processed.width : 0,
        hRatio: processed.height ? Number(pred?.bounding_box?.height || 0) / processed.height : 0,
      },
    }))
    .filter((pred) => pred.bbox.wRatio > 0 && pred.bbox.hRatio > 0)
    .sort((a, b) => b.confidence - a.confidence);

  const top = mapped[0] || null;
  const maturity =
    payload?.analysis_result?.maturity_assessment ||
    payload?.age_estimation?.maturity_assessment ||
    '';
  const confidence = top?.confidence ?? Number(payload?.confidence_score || 0);

  return {
    ready: modelLoaded,
    error: '',
    detections: mapped,
    disease: top?.label || '',
    maturity,
    confidence,
    processingTimeMs: Number(payload?.processing_time_ms || 0),
  };
}
