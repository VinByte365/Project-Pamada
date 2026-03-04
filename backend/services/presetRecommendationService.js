const Disease = require('../models/disease');
const Recommendation = require('../models/recommendation');
const PlantScan = require('../models/plantScan');
const RecommendationLog = require('../models/recommendationLog');
const Plant = require('../models/plant');

function normalizeSeverity(severity) {
  const value = String(severity || '').toLowerCase();
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function normalizeConfidence(confidence) {
  const value = Number(confidence);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildResponsePayload({ disease, confidence, severity, recommendationRows = [], logRows = [] }) {
  const logMap = new Map(logRows.map((log) => [String(log.recommendation_id), log]));
  const dynamicContext = buildDynamicContext({
    diseaseKey: disease.disease_key,
    confidence,
    severity,
  });

  const recommendations = recommendationRows.map((item, index) => {
    const log = logMap.get(String(item._id));
    const basePriority = item.priority;
    const elevatedPriority =
      dynamicContext.severity === 'high' && index < 2 && basePriority !== 'high'
        ? 'high'
        : basePriority;
    const requiredByLowConfidence =
      dynamicContext.lowConfidence && index === 0
        ? true
        : Boolean(item.is_required);
    const textWithContext =
      dynamicContext.lowConfidence && index === 0
        ? `${item.recommendation_text} (verify with a clearer follow-up scan)`
        : item.recommendation_text;
    return {
      id: item._id,
      text: textWithContext,
      priority: elevatedPriority,
      is_required: requiredByLowConfidence,
      completed: Boolean(log?.completed),
      completed_at: log?.completed_at || null,
      source: 'preset',
    };
  });
  const requiredCount = recommendations.filter((item) => item.is_required).length;
  const completedRequiredCount = recommendations.filter((item) => item.is_required && item.completed).length;
  const allCompleted = recommendations.every((item) => item.completed);

  return {
    disease: disease.display_name,
    disease_key: disease.disease_key,
    confidence: normalizeConfidence(confidence),
    severity: normalizeSeverity(severity),
    recommendations,
    progress: {
      all_completed: allCompleted,
      required_completed: completedRequiredCount,
      required_total: requiredCount,
      completion_rate: recommendations.length
        ? Math.round((recommendations.filter((item) => item.completed).length / recommendations.length) * 100)
        : 0,
    },
    dynamic_context: dynamicContext,
    next_step: allCompleted
      ? 'care_plan_completed_recommended_rescan'
      : 'continue_care_plan',
  };
}

function buildDynamicContext({ diseaseKey, confidence, severity }) {
  const normalizedDiseaseKey = String(diseaseKey || '').toLowerCase();
  const normalizedSeverity = normalizeSeverity(severity);
  const normalizedConfidence = normalizeConfidence(confidence);
  const targetDate = new Date();
  targetDate.setDate(
    targetDate.getDate() + (normalizedSeverity === 'high' ? 2 : normalizedSeverity === 'medium' ? 4 : 7)
  );
  return {
    disease_key: normalizedDiseaseKey,
    severity: normalizedSeverity,
    lowConfidence: normalizedConfidence < 0.65,
    recommended_rescan_by: targetDate.toISOString(),
    advisory: normalizedDiseaseKey === 'healthy'
      ? 'Plant is healthy; complete routine preventive tasks and continue weekly scans.'
      : normalizedSeverity === 'high'
        ? 'High-risk condition. Complete required actions today and rescan within 48 hours.'
        : normalizedSeverity === 'medium'
          ? 'Moderate risk. Complete required actions and verify progress within 3-4 days.'
          : 'Low risk. Follow plan and monitor symptom changes daily.',
  };
}

async function getDiseaseByKey(diseaseKey) {
  const normalized = String(diseaseKey || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return Disease.findOne({ disease_key: normalized });
}

async function getRecommendationsByDiseaseId(diseaseId) {
  const rows = await Recommendation.find({ disease_id: diseaseId }).sort({ createdAt: 1 });
  const priorityRank = { high: 0, medium: 1, low: 2 };
  rows.sort((a, b) => {
    if (Boolean(a.is_required) !== Boolean(b.is_required)) {
      return a.is_required ? -1 : 1;
    }
    return (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
  });
  return rows;
}

async function createPlantScanWithRecommendations({
  userId,
  plantId,
  diseaseKey,
  confidence,
  severity,
  legacyScanId = null,
}) {
  const disease = await getDiseaseByKey(diseaseKey);
  if (!disease) {
    const error = new Error(`Disease mapping not found for disease_key: ${diseaseKey}`);
    error.code = 'DISEASE_KEY_NOT_MAPPED';
    throw error;
  }

  const recommendationRows = await getRecommendationsByDiseaseId(disease._id);
  const plantScan = await PlantScan.create({
    user_id: userId,
    plant_id: plantId,
    disease_id: disease._id,
    confidence: normalizeConfidence(confidence),
    severity: normalizeSeverity(severity),
    scanned_at: new Date(),
    legacy_scan_id: legacyScanId || null,
  });

  const logs = recommendationRows.length
    ? await RecommendationLog.insertMany(
        recommendationRows.map((item) => ({
          plant_scan_id: plantScan._id,
          recommendation_id: item._id,
          completed: false,
          completed_at: null,
        }))
      )
    : [];

  return {
    plantScan,
    payload: buildResponsePayload({
      disease,
      confidence,
      severity,
      recommendationRows,
      logRows: logs,
    }),
  };
}

async function buildStructuredRecommendationsByDiseaseKey({ diseaseKey, confidence, severity }) {
  const disease = await getDiseaseByKey(diseaseKey);
  if (!disease) {
    return null;
  }
  const recommendationRows = await getRecommendationsByDiseaseId(disease._id);
  return buildResponsePayload({
    disease,
    confidence,
    severity,
    recommendationRows,
    logRows: [],
  });
}

async function getStructuredRecommendationsByPlantScanId(plantScanId) {
  const plantScan = await PlantScan.findById(plantScanId).populate('disease_id');
  if (!plantScan) return null;

  const recommendationRows = await getRecommendationsByDiseaseId(plantScan.disease_id._id);
  let logRows = await RecommendationLog.find({ plant_scan_id: plantScan._id });
  const existingLogRecommendationIds = new Set(logRows.map((row) => String(row.recommendation_id)));
  const missingLogDocs = recommendationRows
    .filter((row) => !existingLogRecommendationIds.has(String(row._id)))
    .map((row) => ({
      plant_scan_id: plantScan._id,
      recommendation_id: row._id,
      completed: false,
      completed_at: null,
    }));
  if (missingLogDocs.length) {
    await RecommendationLog.insertMany(missingLogDocs, { ordered: false }).catch(() => {});
    logRows = await RecommendationLog.find({ plant_scan_id: plantScan._id });
  }

  return {
    plantScan,
    payload: buildResponsePayload({
      disease: plantScan.disease_id,
      confidence: plantScan.confidence,
      severity: plantScan.severity,
      recommendationRows,
      logRows,
    }),
  };
}

async function markRecommendationCompletion({ plantScanId, recommendationId, completed }) {
  const nextCompleted = Boolean(completed);
  const update = {
    completed: nextCompleted,
    completed_at: nextCompleted ? new Date() : null,
  };

  const log = await RecommendationLog.findOneAndUpdate(
    {
      plant_scan_id: plantScanId,
      recommendation_id: recommendationId,
    },
    {
      $set: update,
      $setOnInsert: {
        plant_scan_id: plantScanId,
        recommendation_id: recommendationId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!log) {
    return null;
  }

  const [allLogs, plantScan] = await Promise.all([
    RecommendationLog.find({ plant_scan_id: plantScanId }),
    PlantScan.findById(plantScanId),
  ]);
  const allCompleted = allLogs.length > 0 && allLogs.every((entry) => entry.completed);

  if (plantScan) {
    plantScan.care_plan_completed = allCompleted;
    plantScan.care_plan_completed_at = allCompleted ? new Date() : null;
    await plantScan.save();

    if (allCompleted) {
      await Plant.updateOne(
        { _id: plantScan.plant_id },
        {
          $set: {
            'current_status.primary_condition': 'healthy',
            'current_status.disease_severity': 'none',
          },
          $max: {
            'current_status.health_score': 85,
          },
        }
      );
    }
  }

  return {
    log,
    care_plan: {
      all_completed: allCompleted,
      completed_count: allLogs.filter((entry) => entry.completed).length,
      total_count: allLogs.length,
      completed_at: allCompleted ? (plantScan?.care_plan_completed_at || new Date()) : null,
      next_step: allCompleted ? 'care_plan_completed_recommended_rescan' : 'continue_care_plan',
    },
  };
}

module.exports = {
  buildStructuredRecommendationsByDiseaseKey,
  createPlantScanWithRecommendations,
  getDiseaseByKey,
  getStructuredRecommendationsByPlantScanId,
  markRecommendationCompletion,
};
