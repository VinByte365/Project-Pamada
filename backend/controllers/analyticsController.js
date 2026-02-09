const Analytics = require('../models/analytics');
const Scan = require('../models/scan');
const Plant = require('../models/plant');
const asyncHandler = require('../utils/controllerWrapper');

// @desc    Get analytics for date range
// @route   GET /api/v1/analytics
// @access  Private
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, period = 'daily' } = req.query;

  let start, end;
  
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    // Default to last 30 days
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 30);
  }

  const query = {
    user_id: req.user.id,
    date: { $gte: start, $lte: end }
  };

  const analytics = await Analytics.find(query).sort({ date: 1 });

  res.status(200).json({
    success: true,
    count: analytics.length,
    data: {
      analytics,
      period: {
        start,
        end
      }
    }
  });
});

// @desc    Get daily analytics
// @route   GET /api/v1/analytics/daily
// @access  Private
exports.getDailyAnalytics = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Check if analytics already exist for this date
  let analytics = await Analytics.findOne({
    user_id: req.user.id,
    date: {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999))
    }
  });

  if (!analytics) {
    // Generate analytics for the date
    const metrics = await Analytics.aggregateDaily(targetDate, req.user.id);

    analytics = await Analytics.create({
      date: targetDate,
      user_id: req.user.id,
      metrics
    });
  }

  res.status(200).json({
    success: true,
    data: {
      analytics
    }
  });
});

// @desc    Get weekly analytics
// @route   GET /api/v1/analytics/weekly
// @access  Private
exports.getWeeklyAnalytics = asyncHandler(async (req, res) => {
  const { weekStart } = req.query;
  
  let start = weekStart ? new Date(weekStart) : new Date();
  start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // End of week (Saturday)
  end.setHours(23, 59, 59, 999);

  const query = {
    user_id: req.user.id,
    date: { $gte: start, $lte: end }
  };

  const dailyAnalytics = await Analytics.find(query).sort({ date: 1 });

  // Aggregate weekly metrics
  const weeklyMetrics = {
    total_scans: 0,
    total_plants_monitored: new Set(),
    harvest_ready_count: 0,
    disease_alerts: 0,
    condition_distribution: {
      healthy: 0,
      leaf_spot: 0,
      root_rot: 0,
      sunburn: 0,
      aloe_rust: 0,
      bacterial_soft_rot: 0,
      anthracnose: 0,
      scale_insect: 0
    },
    pest_distribution: {
      mealybug: 0,
      spider_mite: 0
    },
    avg_health_score: 0,
    avg_confidence: 0,
    avg_processing_time_ms: 0
  };

  let totalHealthScore = 0;
  let totalConfidence = 0;
  let totalProcessingTime = 0;
  let count = 0;

  dailyAnalytics.forEach(day => {
    weeklyMetrics.total_scans += day.metrics.total_scans || 0;
    weeklyMetrics.harvest_ready_count += day.metrics.harvest_ready_count || 0;
    weeklyMetrics.disease_alerts += day.metrics.disease_alerts || 0;

    if (day.metrics.condition_distribution) {
      Object.keys(day.metrics.condition_distribution).forEach(condition => {
        weeklyMetrics.condition_distribution[condition] += 
          day.metrics.condition_distribution[condition] || 0;
      });
    }

    if (day.metrics.pest_distribution) {
      Object.keys(day.metrics.pest_distribution).forEach(pest => {
        weeklyMetrics.pest_distribution[pest] += 
          day.metrics.pest_distribution[pest] || 0;
      });
    }

    if (day.metrics.avg_health_score) {
      totalHealthScore += day.metrics.avg_health_score;
      count++;
    }
    if (day.metrics.avg_confidence) {
      totalConfidence += day.metrics.avg_confidence;
    }
    if (day.metrics.avg_processing_time_ms) {
      totalProcessingTime += day.metrics.avg_processing_time_ms;
    }
  });

  // Get unique plants monitored
  const scans = await Scan.find({
    user_id: req.user.id,
    createdAt: { $gte: start, $lte: end }
  }).distinct('plant_id');

  weeklyMetrics.total_plants_monitored = scans.length;
  weeklyMetrics.avg_health_score = count > 0 ? totalHealthScore / count : 0;
  weeklyMetrics.avg_confidence = dailyAnalytics.length > 0 ? totalConfidence / dailyAnalytics.length : 0;
  weeklyMetrics.avg_processing_time_ms = dailyAnalytics.length > 0 ? totalProcessingTime / dailyAnalytics.length : 0;

  res.status(200).json({
    success: true,
    data: {
      period: {
        start,
        end
      },
      metrics: weeklyMetrics
    }
  });
});

// @desc    Get monthly analytics
// @route   GET /api/v1/analytics/monthly
// @access  Private
exports.getMonthlyAnalytics = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  
  const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const start = new Date(targetYear, targetMonth, 1);
  const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const query = {
    user_id: req.user.id,
    date: { $gte: start, $lte: end }
  };

  const dailyAnalytics = await Analytics.find(query).sort({ date: 1 });

  // Aggregate monthly metrics (similar to weekly)
  const monthlyMetrics = {
    total_scans: 0,
    total_plants_monitored: new Set(),
    harvest_ready_count: 0,
    disease_alerts: 0,
    condition_distribution: {
      healthy: 0,
      leaf_spot: 0,
      root_rot: 0,
      sunburn: 0,
      aloe_rust: 0,
      bacterial_soft_rot: 0,
      anthracnose: 0,
      scale_insect: 0
    },
    pest_distribution: {
      mealybug: 0,
      spider_mite: 0
    },
    avg_health_score: 0,
    avg_confidence: 0,
    avg_processing_time_ms: 0
  };

  let totalHealthScore = 0;
  let totalConfidence = 0;
  let totalProcessingTime = 0;
  let count = 0;

  dailyAnalytics.forEach(day => {
    monthlyMetrics.total_scans += day.metrics.total_scans || 0;
    monthlyMetrics.harvest_ready_count += day.metrics.harvest_ready_count || 0;
    monthlyMetrics.disease_alerts += day.metrics.disease_alerts || 0;

    if (day.metrics.condition_distribution) {
      Object.keys(day.metrics.condition_distribution).forEach(condition => {
        monthlyMetrics.condition_distribution[condition] += 
          day.metrics.condition_distribution[condition] || 0;
      });
    }

    if (day.metrics.pest_distribution) {
      Object.keys(day.metrics.pest_distribution).forEach(pest => {
        monthlyMetrics.pest_distribution[pest] += 
          day.metrics.pest_distribution[pest] || 0;
      });
    }

    if (day.metrics.avg_health_score) {
      totalHealthScore += day.metrics.avg_health_score;
      count++;
    }
    if (day.metrics.avg_confidence) {
      totalConfidence += day.metrics.avg_confidence;
    }
    if (day.metrics.avg_processing_time_ms) {
      totalProcessingTime += day.metrics.avg_processing_time_ms;
    }
  });

  const scans = await Scan.find({
    user_id: req.user.id,
    createdAt: { $gte: start, $lte: end }
  }).distinct('plant_id');

  monthlyMetrics.total_plants_monitored = scans.length;
  monthlyMetrics.avg_health_score = count > 0 ? totalHealthScore / count : 0;
  monthlyMetrics.avg_confidence = dailyAnalytics.length > 0 ? totalConfidence / dailyAnalytics.length : 0;
  monthlyMetrics.avg_processing_time_ms = dailyAnalytics.length > 0 ? totalProcessingTime / dailyAnalytics.length : 0;

  res.status(200).json({
    success: true,
    data: {
      period: {
        start,
        end,
        month: targetMonth + 1,
        year: targetYear
      },
      metrics: monthlyMetrics
    }
  });
});

// @desc    Get summary statistics
// @route   GET /api/v1/analytics/summary
// @access  Private
exports.getSummary = asyncHandler(async (req, res) => {
  const totalPlants = await Plant.countDocuments({ owner_id: req.user.id });
  const totalScans = await Scan.countDocuments({ user_id: req.user.id });
  
  const harvestReadyPlants = await Plant.countDocuments({
    owner_id: req.user.id,
    'current_status.harvest_ready': true
  });

  const diseasedPlants = await Plant.countDocuments({
    owner_id: req.user.id,
    'current_status.disease_severity': { $ne: 'none' }
  });

  const recentScans = await Scan.find({ user_id: req.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('plant_id', 'plant_id location');

  res.status(200).json({
    success: true,
    data: {
      summary: {
        total_plants: totalPlants,
        total_scans: totalScans,
        harvest_ready: harvestReadyPlants,
        diseased_plants: diseasedPlants,
        healthy_plants: totalPlants - diseasedPlants
      },
      recent_scans: recentScans
    }
  });
});

