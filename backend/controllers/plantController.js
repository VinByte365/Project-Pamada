const Plant = require('../models/plant');
const asyncHandler = require('../utils/controllerWrapper');

// @desc    Get all plants
// @route   GET /api/v1/plants
// @access  Private
exports.getPlants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, harvest_ready, health_status } = req.query;
  
  // Build query
  const query = { owner_id: req.user.id };
  
  if (search) {
    query.$or = [
      { plant_id: { $regex: search, $options: 'i' } },
      { 'location.farm_name': { $regex: search, $options: 'i' } },
      { 'location.plot_number': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (harvest_ready !== undefined) {
    query['current_status.harvest_ready'] = harvest_ready === 'true';
  }
  
  if (health_status) {
    query['current_status.primary_condition'] = health_status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const plants = await Plant.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Plant.countDocuments(query);

  res.status(200).json({
    success: true,
    count: plants.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: {
      plants
    }
  });
});

// @desc    Get single plant
// @route   GET /api/v1/plants/:id
// @access  Private
exports.getPlant = asyncHandler(async (req, res) => {
  const plant = await Plant.findOne({
    _id: req.params.id,
    owner_id: req.user.id
  });

  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      plant
    }
  });
});

// @desc    Create new plant
// @route   POST /api/v1/plants
// @access  Private
exports.createPlant = asyncHandler(async (req, res) => {
  // Add user to req.body
  req.body.owner_id = req.user.id;

  const plant = await Plant.create(req.body);

  res.status(201).json({
    success: true,
    data: {
      plant
    }
  });
});

// @desc    Update plant
// @route   PUT /api/v1/plants/:id
// @access  Private
exports.updatePlant = asyncHandler(async (req, res) => {
  let plant = await Plant.findOne({
    _id: req.params.id,
    owner_id: req.user.id
  });

  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found'
    });
  }

  // Remove fields that shouldn't be updated
  delete req.body.plant_id;
  delete req.body.owner_id;

  plant = await Plant.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: {
      plant
    }
  });
});

// @desc    Delete plant
// @route   DELETE /api/v1/plants/:id
// @access  Private
exports.deletePlant = asyncHandler(async (req, res) => {
  const plant = await Plant.findOne({
    _id: req.params.id,
    owner_id: req.user.id
  });

  if (!plant) {
    return res.status(404).json({
      success: false,
      error: 'Plant not found'
    });
  }

  await plant.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Plant deleted successfully'
  });
});

// @desc    Get plants by status
// @route   GET /api/v1/plants/status/:status
// @access  Private
exports.getPlantsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const query = {
    owner_id: req.user.id,
    'current_status.harvest_ready': status === 'harvest-ready'
  };

  if (status === 'diseased') {
    query['current_status.disease_severity'] = { $ne: 'none' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const plants = await Plant.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Plant.countDocuments(query);

  res.status(200).json({
    success: true,
    count: plants.length,
    total,
    data: {
      plants
    }
  });
});

