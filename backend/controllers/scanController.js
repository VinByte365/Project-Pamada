const Scan = require('../models/scan');
const Plant = require('../models/plant');
const mongoose = require('mongoose');
const { uploadImage, generateThumbnail } = require('../services/imageService');
const { processScanAsync, processScanAnalysis } = require('../services/scanAnalysisService');
const mlService = require('../services/mlService');
const asyncHandler = require('../utils/controllerWrapper');

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

  // Upload image to Cloudinary
  const uploadResult = await uploadImage(req.file.buffer, 'aloe-vera-scans');
  
  // Generate thumbnail
  const thumbnailUrl = await generateThumbnail(uploadResult.public_id);

  // Create scan record (ML analysis will be added later)
  const scanData = {
    plant_id: plant._id,
    user_id: req.user.id,
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

  // Update plant's last scan date
  plant.current_status.last_scan_date = new Date();
  await plant.save();

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
    .populate('plant_id', 'plant_id location')
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
  }).populate('plant_id', 'plant_id location planting_date');

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
  ).populate('plant_id', 'plant_id location');

  // Update plant status based on scan results
  if (scan.analysis_result) {
    const plant = await Plant.findById(scan.plant_id._id);
    if (plant) {
      plant.current_status.health_score = scan.analysis_result.health_score || plant.current_status.health_score;
      plant.current_status.harvest_ready = scan.analysis_result.harvest_ready || false;
      plant.current_status.primary_condition = scan.yolo_predictions[0]?.class || plant.current_status.primary_condition;
      plant.current_status.disease_severity = scan.analysis_result.disease_severity || plant.current_status.disease_severity;
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

