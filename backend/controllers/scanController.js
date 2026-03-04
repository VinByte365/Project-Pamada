const Scan = require('../models/scan');
const Plant = require('../models/plant');
const mongoose = require('mongoose');
const { uploadImage, generateThumbnail } = require('../services/imageService');
const { processScanAsync, processScanAnalysis } = require('../services/scanAnalysisService');
const mlService = require('../services/mlService');
const aloeVerificationService = require('../services/aloeVerificationService');
const asyncHandler = require('../utils/controllerWrapper');
const {
  normalizePrimaryCondition,
  normalizeDiseaseSeverity,
} = require('../utils/plantStatusNormalizer');

const PREVIEW_TTL_MS = Number(process.env.SCAN_PREVIEW_TTL_MS || 10 * 60 * 1000);
const previewStore = new Map();

function createPreviewId() {
  return `preview_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function setPreview(previewId, payload) {
  previewStore.set(previewId, {
    ...payload,
    expiresAt: Date.now() + PREVIEW_TTL_MS,
  });
}

function getPreview(previewId) {
  const value = previewStore.get(previewId);
  if (!value) return null;
  if (Date.now() > Number(value.expiresAt || 0)) {
    previewStore.delete(previewId);
    return null;
  }
  return value;
}

function deletePreview(previewId) {
  previewStore.delete(previewId);
}

function cleanupExpiredPreviews() {
  const now = Date.now();
  for (const [key, value] of previewStore.entries()) {
    if (now > Number(value.expiresAt || 0)) {
      previewStore.delete(key);
    }
  }
}

async function verifyAloeOrFallback(imageBuffer) {
  try {
    return await aloeVerificationService.verify(imageBuffer);
  } catch (error) {
    console.warn('Aloe verification service unavailable, allowing scan fallback:', error.message);
    return { isAloe: true, fallback: true, reason: 'verifier_unavailable' };
  }
}

function mlIndicatesPlant(mlResults = {}, analysisResult = {}) {
  const stage = String(analysisResult?.maturity_stage || mlResults?.maturity_data?.maturity_stage || '').toLowerCase();
  const noPlantFromMaturity = stage.includes('no plant detected');
  const hasRealYoloDetection = Array.isArray(mlResults?.yolo_predictions) && mlResults.yolo_predictions.some((pred) => {
    const box = pred?.bounding_box || {};
    return Number(box.width || 0) > 1 && Number(box.height || 0) > 1;
  });
  const hasMaturityLeaves = Number(mlResults?.maturity_data?.leaf_count || analysisResult?.leaf_count || 0) > 0;
  const colorIndex = Number(mlResults?.visual_features?.leaf_color_index || 0);
  const likelyPlantFromColor = colorIndex >= 0.02;
  return !noPlantFromMaturity || hasRealYoloDetection || hasMaturityLeaves || likelyPlantFromColor;
}

function coerceNoPlantForVerifiedAloe(analysisResult = {}, verifyResult = {}, mlResults = {}) {
  const stage = String(analysisResult?.maturity_stage || '').toLowerCase();
  const isNoPlant = stage.includes('no plant detected');
  if (!isNoPlant || !verifyResult?.isAloe) {
    return analysisResult;
  }

  const leafCount = Number(analysisResult?.leaf_count || mlResults?.maturity_data?.leaf_count || 0);
  const colorIndex = Number(mlResults?.visual_features?.leaf_color_index || 0);
  const fallbackStage = leafCount > 0
    ? (leafCount >= 12 ? 'Mature / Ready for Harvest' : leafCount >= 7 ? 'Developing / Almost Ready' : 'Young / Not Ready')
    : (colorIndex >= 0.02 ? 'Young / Not Ready' : 'Not Ready for Harvest');

  const recommendations = analysisResult?.recommendations || {};
  const treatment = Array.isArray(recommendations.treatment_plan) ? recommendations.treatment_plan : [];
  const normalizedTreatment = treatment.filter((item) => !String(item).toLowerCase().includes('no plant detected'));
  if (!normalizedTreatment.length) {
    normalizedTreatment.push('Plant detected but maturity estimate is low-confidence. Retake scan in good daylight and frame the whole plant.');
  }

  return {
    ...analysisResult,
    leaf_count: Math.max(0, leafCount),
    maturity_stage: fallbackStage,
    recommendations: {
      ...recommendations,
      treatment_plan: normalizedTreatment,
    },
  };
}

function buildVerificationDebug(verifyResult = {}, mlResults = {}, analysisResult = {}) {
  const topPrediction = Array.isArray(mlResults?.yolo_predictions) && mlResults.yolo_predictions.length > 0
    ? mlResults.yolo_predictions[0]
    : null;
  const plantDetectedByMl = mlIndicatesPlant(mlResults, analysisResult);
  return {
    verifier: {
      is_aloe: Boolean(verifyResult?.isAloe),
      provider: verifyResult?.provider || null,
      model: verifyResult?.model || null,
      score: Number(verifyResult?.score || 0),
      competitor_score: Number(verifyResult?.competitorScore || 0),
      threshold: Number(verifyResult?.threshold || 0),
      reason: verifyResult?.reason || null,
      fallback: Boolean(verifyResult?.fallback),
    },
    ml: {
      indicates_plant: plantDetectedByMl,
      maturity_stage: analysisResult?.maturity_stage || mlResults?.maturity_data?.maturity_stage || null,
      leaf_count: Number(analysisResult?.leaf_count || mlResults?.maturity_data?.leaf_count || 0),
      top_prediction: topPrediction
        ? {
            class: topPrediction.class,
            confidence: Number(topPrediction.confidence || 0),
          }
        : null,
    },
    allow_scan: Boolean(verifyResult?.isAloe) || plantDetectedByMl,
  };
}

function buildVerifyOnlyDebug(verifyResult = {}) {
  return {
    verifier: {
      is_aloe: Boolean(verifyResult?.isAloe),
      provider: verifyResult?.provider || null,
      model: verifyResult?.model || null,
      score: Number(verifyResult?.score || 0),
      competitor_score: Number(verifyResult?.competitorScore || 0),
      threshold: Number(verifyResult?.threshold || 0),
      reason: verifyResult?.reason || null,
      fallback: Boolean(verifyResult?.fallback),
    },
    ml: null,
    allow_scan: Boolean(verifyResult?.isAloe),
  };
}

async function resolveUserPlant(plantIdentifier, userId, options = {}) {
  const { fallbackToLatest = false } = options;

  if (plantIdentifier) {
    const plantQuery = [{ plant_id: plantIdentifier }];
    if (mongoose.Types.ObjectId.isValid(plantIdentifier)) {
      plantQuery.unshift({ _id: plantIdentifier });
    }

    const plant = await Plant.findOne({
      owner_id: userId,
      $or: plantQuery
    });

    if (plant) {
      return plant;
    }
  }

  if (!fallbackToLatest) {
    return null;
  }

  return Plant.findOne({ owner_id: userId }).sort({ createdAt: -1 });
}

// @desc    Create new scan
// @route   POST /api/v1/scans
// @access  Private
exports.createScan = asyncHandler(async (req, res) => {
  const { plant_id } = req.body;
  const syncProcessing = String(req.query.sync || '').toLowerCase() === 'true';

  // Resolve plant by Mongo _id or business plant_id, fallback to latest owned plant.
  const plant = await resolveUserPlant(plant_id, req.user.id, { fallbackToLatest: true });

  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found. Please create a plant profile first.'
    });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload an image'
    });
  }

  const verifyResult = await verifyAloeOrFallback(req.file.buffer);
  if (!verifyResult?.isAloe) {
    return res.status(400).json({
      success: false,
      error: 'Scan Aloe Vera plant only.',
      debug: buildVerifyOnlyDebug(verifyResult),
    });
  }

  // Upload image to Cloudinary
  const uploadResult = await uploadImage(req.file.buffer, 'aloe-vera-scans');
  
  // Generate thumbnail
  const thumbnailUrl = await generateThumbnail(uploadResult.public_id);

  // Create scan record (ML analysis will be added later)
  const scanCount = await Scan.countDocuments({ user_id: req.user.id });
  const scanData = {
    plant_id: plant._id,
    user_id: req.user.id,
    scan_number: scanCount + 1,
    image_data: {
      original_url: uploadResult.secure_url,
      thumbnail_url: thumbnailUrl,
      file_size: req.file.size,
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height
      }
    },
    scan_metadata: {
      device_type: req.headers['user-agent'],
      app_version: req.body.app_version || '1.0.0'
    }
  };

  const scan = await Scan.create(scanData);

  // Update plant's last scan date without validating unrelated legacy status values.
  await Plant.updateOne(
    { _id: plant._id, owner_id: req.user.id },
    { $set: { 'current_status.last_scan_date': new Date() } }
  );

  if (syncProcessing) {
    try {
      const updatedScan = await processScanAnalysis(scan._id.toString(), req.file.buffer);
      return res.status(201).json({
        success: true,
        data: {
          scan: updatedScan
        },
        message: 'Scan created and analyzed successfully.'
      });
    } catch (error) {
      console.error('Sync scan analysis failed:', error);
      return res.status(201).json({
        success: true,
        data: {
          scan
        },
        message: 'Scan created. Analysis will be processed shortly.'
      });
    }
  }

  // Process scan analysis asynchronously
  processScanAsync(scan._id.toString()).catch(err => {
    console.error('Error processing scan analysis:', err);
  });

  res.status(201).json({
    success: true,
    data: {
      scan
    },
    message: 'Scan created successfully. Analysis will be processed shortly.'
  });
});

// @desc    Analyze scan preview (no record creation yet)
// @route   POST /api/v1/scans/analyze-preview
// @access  Private
exports.analyzePreview = asyncHandler(async (req, res) => {
  cleanupExpiredPreviews();

  const { plant_id } = req.body;
  const plant = await resolveUserPlant(plant_id, req.user.id, { fallbackToLatest: true });
  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found. Please create a plant profile first.',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload an image',
    });
  }

  const verifyResult = await verifyAloeOrFallback(req.file.buffer);
  if (!verifyResult?.isAloe) {
    return res.status(400).json({
      success: false,
      error: 'Scan Aloe Vera plant only.',
      debug: buildVerifyOnlyDebug(verifyResult),
    });
  }

  const mlResults = await mlService.analyzeImage(req.file.buffer, {
    filename: `preview_${Date.now()}.jpg`,
  });
  let analysisResult = mlService.generateAnalysisResult(mlResults);
  analysisResult = coerceNoPlantForVerifiedAloe(analysisResult, verifyResult, mlResults);
  const verificationDebug = buildVerificationDebug(verifyResult, mlResults, analysisResult);
  const allowScan = verificationDebug.allow_scan;

  if (!allowScan) {
    return res.status(400).json({
      success: false,
      error: 'Scan Aloe Vera plant only.',
      debug: verificationDebug,
    });
  }

  const uploadResult = await uploadImage(req.file.buffer, 'aloe-vera-scans');
  const thumbnailUrl = await generateThumbnail(uploadResult.public_id);

  const previewId = createPreviewId();
  setPreview(previewId, {
    user_id: String(req.user.id),
    plant_id: String(plant._id),
    image_data: {
      original_url: uploadResult.secure_url,
      thumbnail_url: thumbnailUrl,
      file_size: req.file.size,
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height,
      },
    },
    yolo_predictions: mlResults.yolo_predictions || [],
    visual_features: mlResults.visual_features || {},
    analysis_result: analysisResult,
    recommendations: analysisResult.recommendations || {},
    processing_time_ms: mlResults.processing_time_ms || 0,
    app_version: req.body.app_version || '1.0.0',
    device_type: req.headers['user-agent'],
  });

  return res.status(200).json({
    success: true,
    data: {
      preview_id: previewId,
      image_data: {
        original_url: uploadResult.secure_url,
        thumbnail_url: thumbnailUrl,
      },
      yolo_predictions: mlResults.yolo_predictions || [],
      visual_features: mlResults.visual_features || {},
      analysis_result: analysisResult,
      recommendations: analysisResult.recommendations || {},
      processing_time_ms: mlResults.processing_time_ms || 0,
      verification: verificationDebug,
    },
    message: 'Preview analyzed successfully.',
  });
});

// @desc    Debug aloe verification and ML plant-detection signals
// @route   POST /api/v1/scans/verify-aloe-debug
// @access  Private
exports.verifyAloeDebug = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload an image',
    });
  }

  const verifyResult = await verifyAloeOrFallback(req.file.buffer);
  if (!verifyResult?.isAloe) {
    return res.status(200).json({
      success: true,
      data: buildVerifyOnlyDebug(verifyResult),
      message: 'Image fails aloe verification gate.',
    });
  }
  const mlResults = await mlService.analyzeImage(req.file.buffer, {
    filename: `debug_${Date.now()}.jpg`,
  });
  const analysisResult = mlService.generateAnalysisResult(mlResults);
  const verificationDebug = buildVerificationDebug(verifyResult, mlResults, analysisResult);

  return res.status(200).json({
    success: true,
    data: verificationDebug,
    message: verificationDebug.allow_scan
      ? 'Image passes aloe verification gate.'
      : 'Image fails aloe verification gate.',
  });
});

// @desc    Confirm and save analyzed preview as scan record
// @route   POST /api/v1/scans/confirm-preview
// @access  Private
exports.confirmPreview = asyncHandler(async (req, res) => {
  cleanupExpiredPreviews();

  const previewId = String(req.body.preview_id || '').trim();
  const plantIdInput = req.body.plant_id;
  if (!previewId) {
    return res.status(400).json({
      success: false,
      error: 'preview_id is required',
    });
  }

  const preview = getPreview(previewId);
  if (!preview) {
    return res.status(404).json({
      success: false,
      error: 'Preview expired or not found. Please scan again.',
    });
  }

  if (String(preview.user_id) !== String(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: 'Not allowed to confirm this preview.',
    });
  }

  const plant = await resolveUserPlant(plantIdInput || preview.plant_id, req.user.id, { fallbackToLatest: true });
  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found. Please create a plant profile first.',
    });
  }

  const scanCount = await Scan.countDocuments({ user_id: req.user.id });
  const scan = await Scan.create({
    plant_id: plant._id,
    user_id: req.user.id,
    scan_number: scanCount + 1,
    image_data: preview.image_data,
    yolo_predictions: preview.yolo_predictions || [],
    visual_features: preview.visual_features || {},
    analysis_result: preview.analysis_result || {},
    recommendations: preview.recommendations || {},
    scan_metadata: {
      device_type: preview.device_type,
      app_version: preview.app_version || '1.0.0',
      processing_time_ms: preview.processing_time_ms || 0,
      model_version: process.env.MODEL_VERSION || '1.0.0',
    },
  });

  await Plant.updateOne(
    { _id: plant._id, owner_id: req.user.id },
    { $set: { 'current_status.last_scan_date': new Date() } }
  );

  deletePreview(previewId);

  return res.status(201).json({
    success: true,
    data: {
      scan,
    },
    message: 'Scan saved successfully.',
  });
});

// @desc    Check ML service health
// @route   GET /api/v1/scans/ml-health
// @access  Private
exports.getMlHealth = asyncHandler(async (req, res) => {
  const healthy = await mlService.healthCheck();
  res.status(200).json({
    success: true,
    data: {
      healthy
    }
  });
});

// @desc    Run live detection without creating scan records
// @route   POST /api/v1/scans/live-detect
// @access  Private
exports.liveDetect = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload an image frame',
    });
  }

  const verifyResult = await verifyAloeOrFallback(req.file.buffer);
  if (!verifyResult?.isAloe) {
    return res.status(400).json({
      success: false,
      error: 'Scan Aloe Vera plant only.',
      debug: buildVerifyOnlyDebug(verifyResult),
    });
  }

  const mlResults = await mlService.analyzeImage(req.file.buffer, {
    filename: `live_${Date.now()}.jpg`,
  });
  const analysisResult = mlService.generateAnalysisResult(mlResults);

  res.status(200).json({
    success: true,
    data: {
      yolo_predictions: mlResults.yolo_predictions || [],
      age_estimation: mlResults.age_estimation || {},
      confidence_score: mlResults.confidence_score || 0,
      analysis_result: analysisResult,
      processing_time_ms: mlResults.processing_time_ms || 0,
    },
  });
});

// @desc    Get all scans
// @route   GET /api/v1/scans
// @access  Private
exports.getScans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, plant_id, disease_detected } = req.query;

  // Build query
  const query = { user_id: req.user.id };

  if (plant_id) {
    const plant = await resolveUserPlant(plant_id, req.user.id);

    if (!plant) {
      return res.status(404).json({
        success: false,
        error: 'Plant not found'
      });
    }

    query.plant_id = plant._id;
  }

  if (disease_detected !== undefined) {
    query['analysis_result.disease_detected'] = disease_detected === 'true';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const scans = await Scan.find(query)
    .populate('plant_id', 'plant_id location current_status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Scan.countDocuments(query);

  res.status(200).json({
    success: true,
    count: scans.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      scans
    }
  });
});

// @desc    Get single scan
// @route   GET /api/v1/scans/:id
// @access  Private
exports.getScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({
    _id: req.params.id,
    user_id: req.user.id
  }).populate('plant_id', 'plant_id location planting_date current_status');

  if (!scan) {
    return res.status(404).json({
      success: false,
      error: 'Scan not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      scan
    }
  });
});

// @desc    Update scan (for ML results)
// @route   PUT /api/v1/scans/:id
// @access  Private
exports.updateScan = asyncHandler(async (req, res) => {
  let scan = await Scan.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!scan) {
    return res.status(404).json({
      success: false,
      error: 'Scan not found'
    });
  }

  // Only allow updating analysis results and metadata
  const allowedFields = [
    'yolo_predictions',
    'visual_features',
    'analysis_result',
    'recommendations',
    'scan_metadata',
    'self_learning_status'
  ];

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  scan = await Scan.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('plant_id', 'plant_id location current_status');

  // Update plant status based on scan results
  if (scan.analysis_result) {
    const plant = await Plant.findById(scan.plant_id._id);
    if (plant) {
      plant.current_status.health_score = scan.analysis_result.health_score || plant.current_status.health_score;
      const nextHarvestReady = Boolean(scan.analysis_result.harvest_ready);
      if (plant.current_status.lifecycle_stage !== 'harvested') {
        plant.current_status.harvest_ready = nextHarvestReady;
        plant.current_status.lifecycle_stage = nextHarvestReady ? 'ready' : 'growing';
      } else {
        plant.current_status.harvest_ready = false;
      }
      plant.current_status.primary_condition = normalizePrimaryCondition(
        scan.yolo_predictions[0]?.class,
        normalizePrimaryCondition(plant.current_status.primary_condition, 'healthy')
      );
      plant.current_status.disease_severity = normalizeDiseaseSeverity(
        scan.analysis_result.disease_severity,
        normalizeDiseaseSeverity(plant.current_status.disease_severity, 'none')
      );
      plant.current_status.estimated_days_to_harvest = scan.analysis_result.estimated_days_to_harvest;
      await plant.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      scan
    }
  });
});

// @desc    Delete scan
// @route   DELETE /api/v1/scans/:id
// @access  Private
exports.deleteScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!scan) {
    return res.status(404).json({
      success: false,
      error: 'Scan not found'
    });
  }

  // Delete image from Cloudinary if needed
  // (Implementation can be added later)

  await scan.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Scan deleted successfully'
  });
});

// @desc    Get scans by plant
// @route   GET /api/v1/scans/plant/:plantId
// @access  Private
exports.getScansByPlant = asyncHandler(async (req, res) => {
  const { plantId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const plant = await resolveUserPlant(plantId, req.user.id);

  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found'
    });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const scans = await Scan.find({
    plant_id: plant._id,
    user_id: req.user.id
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Scan.countDocuments({
    plant_id: plant._id,
    user_id: req.user.id
  });

  res.status(200).json({
    success: true,
    count: scans.length,
    total,
    data: {
      scans
    }
  });
});

