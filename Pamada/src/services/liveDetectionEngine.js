import * as ImageManipulator from "expo-image-manipulator";
import { apiRequest } from "../utils/api";

let modelLoaded = false;

const aloeRelatedClasses = new Set([
  "healthy",
  "leaf_spot",
  "root_rot",
  "sunburn",
  "aloe_rust",
  "bacterial_soft_rot",
  "anthracnose",
  "scale_insect",
  "mealybug",
  "spider_mite",
]);

export async function initializeLiveDetectionModel() {
  // Live imaging uses backend ML inference API for now.
  modelLoaded = true;
  return { ready: modelLoaded, error: "" };
}

export async function preprocessFrame(uri) {
  const processed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 640, height: 640 } }],
    { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
  );
  return processed;
}

export async function runLiveDetection(imageUri, token) {
  const processed = await preprocessFrame(imageUri);

  const formData = new FormData();
  formData.append("image", {
    uri: processed.uri,
    name: `live-${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  const response = await apiRequest("/api/v1/scans/live-detect", {
    method: "POST",
    token,
    body: formData,
  });

  const payload = response?.data || {};
  const predictions = payload.yolo_predictions || [];
  const maturityDetections = payload?.maturity_data?.detections || [];

  const toBoxRatios = (box = {}) => {
    const rawX = Number(
      box.x ?? box.left ?? box.x1 ?? (Array.isArray(box) ? box[0] : 0) ?? 0,
    );
    const rawY = Number(
      box.y ?? box.top ?? box.y1 ?? (Array.isArray(box) ? box[1] : 0) ?? 0,
    );
    const rawW = Number(
      box.width ??
        (box.x2 !== undefined ? Number(box.x2) - rawX : undefined) ??
        (Array.isArray(box) ? box[2] : 0),
    );
    const rawH = Number(
      box.height ??
        (box.y2 !== undefined ? Number(box.y2) - rawY : undefined) ??
        (Array.isArray(box) ? box[3] : 0),
    );

    const maxVal = Math.max(rawX, rawY, rawW, rawH);
    const isNormalized = maxVal <= 1.5;
    const width = processed.width || 1;
    const height = processed.height || 1;

    return {
      xRatio: isNormalized ? rawX : rawX / width,
      yRatio: isNormalized ? rawY : rawY / height,
      wRatio: isNormalized ? rawW : rawW / width,
      hRatio: isNormalized ? rawH : rawH / height,
    };
  };

  const mapped = predictions
    .filter((pred) => aloeRelatedClasses.has(pred.class))
    .map((pred) => ({
      label: pred.class,
      confidence: Number(pred.confidence || 0),
      bbox: toBoxRatios(pred?.bounding_box || {}),
    }))
    .filter((pred) => pred.bbox.wRatio > 0 && pred.bbox.hRatio > 0);

  const mappedFromMaturity = maturityDetections
    .map((det) => ({
      label: det.label || "aloe",
      confidence: Number(det.confidence || 0),
      bbox: toBoxRatios(det.bounding_box || det.box || det.bbox || {}),
    }))
    .filter((pred) => pred.bbox.wRatio > 0 && pred.bbox.hRatio > 0);

  const combined = [...mapped, ...mappedFromMaturity].sort(
    (a, b) => b.confidence - a.confidence,
  );

  const top = combined[0] || null;
  const maturity =
    payload?.maturity_prediction?.maturity_stage ||
    payload?.analysis_result?.maturity_assessment ||
    payload?.age_estimation?.maturity_assessment ||
    "";
  // Prefer the combined confidence_score from the backend (disease + maturity + visual)
  const combinedConfidence = Number(payload?.confidence_score || 0);
  const confidence =
    combinedConfidence > 0 ? combinedConfidence : (top?.confidence ?? 0);

  return {
    ready: modelLoaded,
    error: "",
    detections: combined,
    disease: top?.label || "",
    maturity,
    confidence,
    processingTimeMs: Number(payload?.processing_time_ms || 0),
  };
}
