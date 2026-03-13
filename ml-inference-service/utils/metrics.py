
def calculate_confidence_score(yolo_predictions, visual_features, maturity_predictions=None):
    try:
        if yolo_predictions:
            max_confidence = max(pred.get('confidence', 0) for pred in yolo_predictions)
        else:
            max_confidence = 0.5

        color_index = visual_features.get('leaf_color_index', 0.5)
        pattern_score = visual_features.get('surface_pattern_score', 0.5)
        feature_quality = (color_index + pattern_score) / 2

        if maturity_predictions is not None:
            if maturity_predictions:
                maturity_confidence = sum(
                    d.get('confidence', 0) for d in maturity_predictions
                ) / len(maturity_predictions)
            else:
                maturity_confidence = 0.0

            # Combined: 40% disease YOLO, 30% maturity YOLO, 30% visual features
            confidence = (
                max_confidence * 0.4
                + maturity_confidence * 0.3
                + feature_quality * 0.3
            )
        else:
            # Legacy fallback: 70% disease YOLO, 30% visual features
            confidence = (max_confidence * 0.7) + (feature_quality * 0.3)

        return min(max(confidence, 0), 1)
    except Exception:
        return 0.5
