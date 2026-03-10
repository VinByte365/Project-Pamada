import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from './AuthContext';

const AppDataContext = createContext(null);

const conditionLabelMap = {
  healthy: 'Healthy',
  leaf_spot: 'Leaf Spot',
  root_rot: 'Root Rot',
  sunburn: 'Sunburn',
  aloe_rust: 'Aloe Rust',
  bacterial_soft_rot: 'Bacterial Soft Rot',
  anthracnose: 'Anthracnose',
  scale_insect: 'Scale Insect',
  mealybug: 'Mealybug',
  spider_mite: 'Spider Mite',
};

const defaultStats = [
  { label: 'Total Scans', value: '0', icon: 'camera', tone: 'primary' },
  { label: 'Healthy Plants', value: '0', icon: 'checkmark-circle', tone: 'success' },
  { label: 'At Risk', value: '0', icon: 'warning', tone: 'warning' },
  { label: 'Ready to Harvest', value: '0', icon: 'leaf', tone: 'successDark' },
];

export function AppDataProvider({ children }) {
  const { token, user } = useAuth();
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [analytics, setAnalytics] = useState({
    totalPlants: 0,
    harvestRate: '0%',
    diseaseRate: '0%',
    avgMaturity: '0%',
    prediction: 'No predictions yet',
    growthNote: 'Start scanning plants to generate analytics.',
    diseaseDistribution: [],
  });
  const [loading, setLoading] = useState(false);
  const [plantId, setPlantId] = useState(null);

  const formatMaturityReadiness = (scan) => {
    const analysis = scan?.analysis_result || {};
    const stage = String(analysis?.maturity_stage || '').toLowerCase().trim();
    if (stage) {
      if (stage.includes('no plant detected')) return 'No Plant Detected';
      if (stage.includes('ready for harvest') || stage.includes('mature')) return 'Ready for Harvest';
      if (stage.includes('developing') || stage.includes('almost ready')) return 'Almost Ready';
      if (stage.includes('young') || stage.includes('not ready')) return 'Not Ready for Harvest';
      return 'Not Ready for Harvest';
    }

    const assessment = String(analysis?.maturity_assessment || '').toLowerCase().trim();
    if (assessment === 'optimal') return 'Ready for Harvest';
    if (assessment === 'maturing') return 'Almost Ready';
    if (assessment === 'immature') return 'Not Ready for Harvest';

    if (analysis?.harvest_ready === true) return 'Ready for Harvest';

    if (typeof analysis?.estimated_days_to_harvest === 'number') {
      return analysis.estimated_days_to_harvest <= 0
        ? 'Ready for Harvest'
        : 'Not Ready for Harvest';
    }

    const hasAnalysis = Object.keys(analysis).length > 0;
    return hasAnalysis ? 'Not Ready for Harvest' : 'Not Available';
  };

  const normalizeScan = (scan, fallbackScanNumber = null, previous = null) => {
    const createdAt = scan?.createdAt ? new Date(scan.createdAt) : new Date();
    const noPlantDetected = String(scan?.analysis_result?.maturity_stage || '').toLowerCase().includes('no plant detected');
    const maturity = formatMaturityReadiness(scan);
    const primaryClass = scan?.yolo_predictions?.[0]?.class
      || (scan?.analysis_result?.disease_detected ? 'leaf_spot' : 'healthy');
    const lifecycleStage = String(scan?.plant_id?.current_status?.lifecycle_stage || '').toLowerCase();
    const isHarvestReady = maturity === 'Ready for Harvest' || scan?.analysis_result?.harvest_ready === true;
    const status = lifecycleStage === 'harvested'
      ? 'harvested'
      : noPlantDetected
        ? 'leaf_spot'
        : (isHarvestReady ? 'ready' : primaryClass);
    const resolvedScanNumber = Number(scan?.scan_number || fallbackScanNumber || previous?.scanNumber || 0) || null;
    const basePlantName = scan?.plant_id?.plant_id
      ? `${scan.plant_id.plant_id}${scan.plant_id.location?.plot_number ? ` - Plot ${scan.plant_id.location.plot_number}` : ''}`
      : 'Aloe Vera Plant';
    const scanName = resolvedScanNumber
      ? `Scan #${String(resolvedScanNumber).padStart(4, '0')}`
      : basePlantName;
    const diseases = (scan?.yolo_predictions || [])
      .filter((pred) => pred.class && pred.class !== 'healthy')
      .map((pred) => conditionLabelMap[pred.class] || pred.class);
    const uniqueDiseases = Array.from(new Set(diseases));
    const topPrediction = (scan?.yolo_predictions || []).reduce(
      (best, pred) => (pred?.confidence > (best?.confidence || 0) ? pred : best),
      null
    );
    const detectedSummary = noPlantDetected
      ? 'No plant detected'
      : scan?.analysis_result?.disease_detected
      ? (scan?.analysis_result?.disease_details?.join(', ') || uniqueDiseases.join(', ') || 'Disease detected')
      : (scan?.analysis_result?.harvest_ready ? 'Ready for harvest' : 'Plant appears healthy');
    const confidenceLevel = topPrediction?.confidence
      ? Math.round(topPrediction.confidence * 100)
      : 0;

    return {
      id: scan?._id || scan?.scan_id || `${Date.now()}`,
      mongoId: scan?._id || previous?.mongoId || null,
      plantMongoId: scan?.plant_id?._id || previous?.plantMongoId || null,
      scanNumber: resolvedScanNumber,
      plantName: scanName,
      plantLabel: basePlantName,
      date: createdAt.toISOString().slice(0, 10),
      time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      maturity,
      image: scan?.image_data?.thumbnail_url || scan?.image_data?.original_url,
      diseases: uniqueDiseases,
      detectedSummary,
      confidenceLevel,
      raw: scan,
    };
  };

  const upsertScan = (scan) => {
    setScans((prev) => {
      const incomingId = scan?._id || scan?.scan_id;
      const index = prev.findIndex((item) => item.id === incomingId);
      const previous = index >= 0 ? prev[index] : null;
      const normalized = normalizeScan(scan, previous?.scanNumber, previous);
      if (index === -1) {
        return [normalized, ...prev];
      }
      const next = [...prev];
      next[index] = normalized;
      return next;
    });
  };

  const ensurePlant = async () => {
    if (!token) return null;
    if (plantId) {
      try {
        const existingPlant = await apiRequest(`/api/v1/plants/${plantId}`, {
          method: 'GET',
          token,
        });
        if (existingPlant?.data?.plant?._id) {
          return plantId;
        }
      } catch (error) {
        // Cached plantId can be stale (deleted/changed ownership); resolve again below.
      }
      setPlantId(null);
    }

    const plantResponse = await apiRequest('/api/v1/plants?limit=1', {
      method: 'GET',
      token,
    });
    const existing = plantResponse?.data?.plants?.[0];
    if (existing?._id) {
      setPlantId(existing._id);
      return existing._id;
    }

    const payload = {
      planting_date: new Date().toISOString(),
      location: {
        farm_name: user?.full_name ? `${user.full_name}'s Farm` : 'Pamada Farm',
      },
      metadata: {
        variety: 'Aloe barbadensis Miller',
        notes: 'Auto-created for initial scans.',
      },
    };

    const created = await apiRequest('/api/v1/plants', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });

    const createdPlant = created?.data?.plant;
    if (createdPlant?._id) {
      setPlantId(createdPlant._id);
      return createdPlant._id;
    }
    return null;
  };

  const refreshSummary = async () => {
    if (!token) return;
    const summary = await apiRequest('/api/v1/analytics/summary', {
      method: 'GET',
      token,
    });

    const summaryData = summary?.data?.summary || {};
    const recent = summary?.data?.recent_scans || [];

    const totalPlants = summaryData.total_plants || 0;
    const totalScans = summaryData.total_scans || 0;
    const diseasedPlants = summaryData.diseased_plants || 0;
    const harvestReady = summaryData.harvest_ready || 0;
    const healthyPlants = summaryData.healthy_plants || Math.max(0, totalPlants - diseasedPlants);

    setStats([
      { label: 'Total Scans', value: String(totalScans), icon: 'camera', tone: 'primary' },
      { label: 'Healthy Plants', value: String(healthyPlants), icon: 'checkmark-circle', tone: 'success' },
      { label: 'At Risk', value: String(diseasedPlants), icon: 'warning', tone: 'warning' },
      { label: 'Ready to Harvest', value: String(harvestReady), icon: 'leaf', tone: 'successDark' },
    ]);

    recent.forEach((scan) => upsertScan(scan));

    const harvestRate = totalPlants > 0 ? Math.round((harvestReady / totalPlants) * 100) : 0;
    const diseaseRate = totalPlants > 0 ? Math.round((diseasedPlants / totalPlants) * 100) : 0;

    setAnalytics((prev) => ({
      ...prev,
      totalPlants,
      harvestRate: `${harvestRate}%`,
      diseaseRate: `${diseaseRate}%`,
      prediction: harvestReady > 0
        ? `${harvestReady} plants ready for harvest`
        : 'No harvest-ready plants yet',
      growthNote: diseaseRate > 10
        ? 'Disease alerts are rising. Prioritize treatment and rescan.'
        : 'Growth rate is stable. Continue routine monitoring.',
    }));
  };

  const refreshScans = async () => {
    if (!token) return;
    const response = await apiRequest('/api/v1/scans?limit=50', {
      method: 'GET',
      token,
    });
    const list = response?.data?.scans || [];
    const chronological = [...list].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const fallbackNumberMap = new Map();
    chronological.forEach((entry, index) => {
      const id = entry?._id || entry?.scan_id;
      if (id) fallbackNumberMap.set(id, index + 1);
    });
    setScans(
      list.map((entry) => {
        const id = entry?._id || entry?.scan_id;
        const fallbackNumber = fallbackNumberMap.get(id);
        return normalizeScan(entry, fallbackNumber);
      })
    );
  };

  const refreshAnalytics = async () => {
    if (!token) return;
    try {
      const weekly = await apiRequest('/api/v1/analytics/weekly', {
        method: 'GET',
        token,
      });
      const metrics = weekly?.data?.metrics || {};
      const condition = metrics.condition_distribution || {};
      const total = Object.values(condition).reduce((acc, value) => acc + value, 0) || 0;
      const distribution = Object.entries(condition)
        .filter(([key]) => key !== 'healthy')
        .map(([key, value]) => ({
          name: conditionLabelMap[key] || key,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          color: key === 'leaf_spot' ? '#F59E0B' : key === 'root_rot' ? '#EF4444' : '#FB923C',
        }))
        .filter((entry) => entry.percentage > 0);

      setAnalytics((prev) => ({
        ...prev,
        avgMaturity: `${Math.round(metrics.avg_health_score || 0)}%`,
        diseaseDistribution: distribution,
      }));
    } catch (error) {
      setAnalytics((prev) => ({
        ...prev,
        avgMaturity: prev.avgMaturity || '0%',
      }));
    }
  };

  const refreshAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await ensurePlant();
      await Promise.all([refreshSummary(), refreshScans(), refreshAnalytics()]);
    } catch (error) {
      // Keep existing data if refresh fails.
    } finally {
      setLoading(false);
    }
  };

  const createScan = async ({ imageUri }) => {
    if (!token) {
      throw new Error('You must be logged in to scan.');
    }
    const currentPlantId = await ensurePlant();
    if (!currentPlantId) {
      throw new Error('No plant is available for scanning.');
    }

    const formData = new FormData();
    formData.append('plant_id', currentPlantId);
    formData.append('image', {
      uri: imageUri,
      name: `scan-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const response = await apiRequest('/api/v1/scans?sync=true', {
      method: 'POST',
      token,
      body: formData,
    });

    const scan = response?.data?.scan;
    if (scan) {
      upsertScan(scan);
      refreshSummary().catch(() => {});
    }
    return scan;
  };

  const analyzeScanPreview = async ({ imageUri }) => {
    if (!token) {
      throw new Error('You must be logged in to scan.');
    }
    const currentPlantId = await ensurePlant();
    if (!currentPlantId) {
      throw new Error('No plant is available for scanning.');
    }

    const formData = new FormData();
    formData.append('plant_id', currentPlantId);
    formData.append('image', {
      uri: imageUri,
      name: `scan-preview-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const response = await apiRequest('/api/v1/scans/analyze-preview', {
      method: 'POST',
      token,
      body: formData,
    });

    const payload = response?.data || {};
    const structuredPayload = payload.recommendation_payload || {
      disease: payload.disease || '',
      confidence: payload.confidence ?? 0,
      severity: payload.severity || 'medium',
      recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
    };
    if (!structuredPayload?.disease || !Array.isArray(structuredPayload.recommendations)) {
      throw new Error('Scan result is missing preset recommendation payload.');
    }
    return {
      preview_id: payload.preview_id || '',
      image_data: payload.image_data || {},
      yolo_predictions: payload.yolo_predictions || [],
      analysis_result: payload.analysis_result || {},
      recommendation_payload: structuredPayload,
      disease_key: payload.disease_key || '',
      confidence: payload.confidence ?? null,
      severity: payload.severity || '',
      processing_time_ms: payload.processing_time_ms || 0,
    };
  };

  const confirmScanPreview = async ({ previewId, plantId }) => {
    if (!token) {
      throw new Error('You must be logged in to save scan.');
    }
    const response = await apiRequest('/api/v1/scans/confirm-preview', {
      method: 'POST',
      token,
      body: JSON.stringify({
        preview_id: previewId,
        plant_id: plantId || plantId === '' ? plantId : undefined,
      }),
    });

    const scan = response?.data?.scan;
    const recommendationPayload = response?.data?.recommendation_payload || null;
    if (scan) {
      upsertScan(scan);
      refreshSummary().catch(() => {});
    }
    return { ...scan, recommendation_payload: recommendationPayload };
  };

  const fetchScanRecommendations = async (scanId) => {
    if (!token) return null;
    const response = await apiRequest(`/api/v1/scans/${scanId}/recommendations`, {
      method: 'GET',
      token,
    });
    return response?.data || null;
  };

  const setScanRecommendationCompletion = async ({ scanId, recommendationId, completed = true }) => {
    if (!token) {
      throw new Error('You must be logged in to update recommendations.');
    }
    const response = await apiRequest(`/api/v1/scans/${scanId}/recommendations/${recommendationId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ completed }),
    });
    return {
      recommendation_log: response?.data?.recommendation_log || null,
      care_plan: response?.data?.care_plan || null,
    };
  };

  const fetchDiseaseCatalog = async () => {
    const response = await apiRequest('/api/v1/diseases?limit=100', {
      method: 'GET',
      token,
    });
    return response?.data?.diseases || [];
  };

  const fetchScanById = async (scanId) => {
    if (!token) return null;
    const response = await apiRequest(`/api/v1/scans/${scanId}`, {
      method: 'GET',
      token,
    });
    const scan = response?.data?.scan;
    if (scan) {
      upsertScan(scan);
    }
    return scan;
  };

  const deleteScan = async (scanId) => {
    if (!token) return;
    await apiRequest(`/api/v1/scans/${scanId}`, {
      method: 'DELETE',
      token,
    });
    setScans((prev) => prev.filter((scan) => String(scan.id) !== String(scanId) && String(scan.mongoId) !== String(scanId)));
    refreshSummary().catch(() => {});
    refreshAnalytics().catch(() => {});
  };

  const markPlantHarvested = async (plantMongoId) => {
    if (!token || !plantMongoId) {
      throw new Error('Missing plant id');
    }

    await apiRequest(`/api/v1/plants/${plantMongoId}/harvested`, {
      method: 'PUT',
      token,
    });

    setScans((prev) =>
      prev.map((scan) =>
        String(scan.plantMongoId) === String(plantMongoId)
          ? {
              ...scan,
              status: 'harvested',
              urgency: 'Harvested',
            }
          : scan
      )
    );
    refreshSummary().catch(() => {});
    refreshAnalytics().catch(() => {});
  };

  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
      setScans([]);
      setStats(defaultStats);
    }
  }, [token]);

  const value = useMemo(
    () => ({
      scans,
      stats,
      recentScans: scans.slice(0, 4),
      analytics,
      loading,
      dailyTip:
        'Use morning light for scanning. It improves leaf texture contrast and model confidence.',
      refreshAll,
      refreshScans,
      refreshSummary,
      createScan,
      analyzeScanPreview,
      confirmScanPreview,
      fetchScanById,
      fetchScanRecommendations,
      setScanRecommendationCompletion,
      fetchDiseaseCatalog,
      deleteScan,
      markPlantHarvested,
    }),
    [scans, stats, analytics, loading]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
