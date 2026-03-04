const Scan = require('../models/scan');
const mlService = require('./mlService');
const {
  createPlantScanWithRecommendations,
  getStructuredRecommendationsByPlantScanId,
} = require('./presetRecommendationService');

function resolveDiseaseKey(mlResults = {}) {
  const rawDiseaseKey = String(
    mlResults?.disease_key ||
    mlResults?.disease_result?.disease_key ||
    ''
  )
    .trim()
    .toLowerCase();
  const yoloClass = String(mlResults?.yolo_predictions?.[0]?.class || '').trim().toLowerCase();
  const aliasMap = {
    fungal_infection: 'fungal_infection',
    leaf_spot: 'fungal_infection',
    aloe_rust: 'fungal_infection',
    anthracnose: 'fungal_infection',
    root_rot: 'root_rot',
    bacterial_soft_rot: 'bacterial_spot',
    bacterial_spot: 'bacterial_spot',
    healthy: 'healthy',
    sunburn: 'unknown_condition',
    scale_insect: 'unknown_condition',
    mealybug: 'unknown_condition',
    spider_mite: 'unknown_condition',
  };
  return aliasMap[rawDiseaseKey] || aliasMap[yoloClass] || 'unknown_condition';
}

/**
 * Process scan image and generate analysis
 * @param {String} scanId - Scan ID
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Updated scan with analysis
 */
async function processScanAnalysis(scanId, imageBuffer) {
  try {
    // Get scan
    const scan = await Scan.findById(scanId);
    if (!scan) {
      throw new Error('Scan not found');
    }

    // Call ML service for analysis
    const mlResults = await mlService.analyzeImage(imageBuffer, {
      filename: `scan_${scanId}.jpg`
    });

    // Generate comprehensive analysis result
    const analysisResult = mlService.generateAnalysisResult(mlResults);

    // Update scan with ML results
    scan.yolo_predictions = mlResults.yolo_predictions || [];
    scan.visual_features = mlResults.visual_features || {};
    scan.analysis_result = analysisResult;
    scan.recommendations = analysisResult.recommendations || {};
    scan.scan_metadata.processing_time_ms = mlResults.processing_time_ms || 0;
    scan.scan_metadata.model_version = process.env.MODEL_VERSION || '1.0.0';

    const diseaseKey = resolveDiseaseKey(mlResults);
    const mappedSeverity = String(mlResults?.severity || '').toLowerCase();
    const mappedConfidence = Number(mlResults?.confidence ?? mlResults?.confidence_score ?? 0);

    scan.disease_key = diseaseKey;
    if (scan.plant_scan_id) {
      const linked = await getStructuredRecommendationsByPlantScanId(scan.plant_scan_id);
      if (linked?.plantScan) {
        scan.disease_id = linked.plantScan.disease_id?._id || linked.plantScan.disease_id;
      }
    } else {
      const created = await createPlantScanWithRecommendations({
        userId: scan.user_id,
        plantId: scan.plant_id,
        diseaseKey,
        confidence: mappedConfidence,
        severity: mappedSeverity || 'medium',
        legacyScanId: scan._id,
      });
      scan.plant_scan_id = created.plantScan._id;
      scan.disease_id = created.plantScan.disease_id;
    }

    // Check if low confidence - flag for validation
    if (mlResults.confidence_score < 0.7) {
      scan.self_learning_status.requires_validation = true;
    }

    await scan.save();

    return scan;
  } catch (error) {
    console.error('Error processing scan analysis:', error);
    throw error;
  }
}

/**
 * Process scan asynchronously (for background jobs)
 * @param {String} scanId - Scan ID
 */
async function processScanAsync(scanId) {
  try {
    const scan = await Scan.findById(scanId).populate('plant_id');
    if (!scan) {
      throw new Error('Scan not found');
    }

    // Fetch image from Cloudinary URL
    const axios = require('axios');
    const response = await axios.get(scan.image_data.original_url, {
      responseType: 'arraybuffer'
    });
    const imageBuffer = Buffer.from(response.data);

    // Process analysis
    await processScanAnalysis(scanId, imageBuffer);
  } catch (error) {
    console.error('Error in async scan processing:', error);
    // Update scan with error status
    const scan = await Scan.findById(scanId);
    if (scan) {
      scan.scan_metadata.processing_time_ms = -1; // Error indicator
      await scan.save();
    }
  }
}

module.exports = {
  processScanAnalysis,
  processScanAsync
};

