const axios = require('axios');
const FormData = require('form-data');

class MLService {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT) || 30000;
    this.maturityConfidenceThreshold = Number(process.env.MATURITY_CONFIDENCE_THRESHOLD || 0.2);
  }

  /**
   * Process image for disease detection and age estimation
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imageBuffer, metadata = {}) {
    try {
      const diseaseResult = await this.analyzeDisease(imageBuffer, metadata);
      let maturityResult = {
        success: false,
        error: 'Maturity analysis unavailable',
        leaf_count: 0,
        maturity_stage: 'No plant detected',
        confidence_threshold: 0.5,
        detections: [],
      };
      try {
        maturityResult = await this.analyzeMaturity(imageBuffer, metadata);
      } catch (maturityError) {
        console.warn('Maturity endpoint unavailable, continuing with disease analysis:', maturityError.message);
      }

      return {
        ...diseaseResult,
        maturity_data: maturityResult,
      };
    } catch (error) {
      console.error('ML Service Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('ML service is not available');
      }
      
      if (error.response) {
        throw new Error(error.response.data.error || 'ML service error');
      }
      
      throw error;
    }
  }

  async analyzeDisease(imageBuffer, metadata = {}) {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: metadata.filename || 'scan.jpg',
      contentType: 'image/jpeg'
    });

    const response = await axios.post(
      `${this.baseURL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: this.timeout
      }
    );

    const payload = response.data || {};

    // New microservice payload format:
    // { disease_key, confidence, severity }
    if (payload?.disease_key) {
      return {
        disease_key: String(payload.disease_key || '').toLowerCase(),
        confidence_score: Number(payload.confidence || 0),
        severity: String(payload.severity || 'medium').toLowerCase(),
        yolo_predictions: [],
        visual_features: {},
        age_estimation: {},
        processing_time_ms: Number(payload.processing_time_ms || 0),
      };
    }

    if (!payload?.success) {
      throw new Error(payload?.error || 'ML disease endpoint error');
    }

    const oldData = payload.data || {};
    if (oldData?.disease_key) {
      oldData.disease_key = String(oldData.disease_key || '').toLowerCase();
    }
    return oldData;
  }

  async analyzeMaturity(imageBuffer, metadata = {}) {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: metadata.filename || 'scan.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('confidence_threshold', String(this.maturityConfidenceThreshold));

    const response = await axios.post(
      `${this.baseURL}/predict/maturity`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: this.timeout
      }
    );

    return response.data || {};
  }

  /**
   * Process multiple images in batch
   * @param {Array<Buffer>} imageBuffers - Array of image buffers
   * @returns {Promise<Array>} Array of analysis results
   */
  async analyzeBatch(imageBuffers) {
    try {
      const formData = new FormData();
      
      imageBuffers.forEach((buffer, index) => {
        formData.append('images', buffer, {
          filename: `image_${index}.jpg`,
          contentType: 'image/jpeg'
        });
      });

      const response = await axios.post(
        `${this.baseURL}/predict/batch`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: this.timeout * imageBuffers.length
        }
      );

      if (response.data.success) {
        return response.data.data.results;
      } else {
        throw new Error(response.data.error || 'ML service error');
      }
    } catch (error) {
      console.error('ML Service Batch Error:', error.message);
      throw error;
    }
  }

  /**
   * Check if ML service is healthy
   * @returns {Promise<Boolean>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate comprehensive analysis result from ML predictions
   * @param {Object} mlResults - Results from ML service
   * @param {Object} plant - Plant document
   * @returns {Object} Comprehensive analysis result
   */
  generateAnalysisResult(mlResults, plant = null) {
    const { yolo_predictions, visual_features, age_estimation, confidence_score, maturity_data } = mlResults;
    const diseaseKey = String(
      mlResults?.disease_key ||
      mlResults?.disease_result?.disease_key ||
      ''
    )
      .trim()
      .toLowerCase();
    const stageLower = maturity_data?.maturity_stage?.toLowerCase() || '';
    const parsedConfidence = Number(
      mlResults?.confidence ??
      mlResults?.disease_result?.confidence ??
      confidence_score ??
      0
    );
    const invalidConfidence = !Number.isFinite(parsedConfidence) || parsedConfidence <= 0;
    const noPlantDetected = stageLower.includes('no plant detected') || invalidConfidence;

    if (noPlantDetected) {
      return {
        leaf_count: 0,
        maturity_stage: 'No plant detected',
        harvest_ready: false,
        maturity_assessment: 'immature',
        health_score: 0,
        disease_detected: false,
        disease_severity: 'none',
        recommended_action: 'monitor_daily',
        estimated_days_to_harvest: null,
        confidence_score: 0,
        recommendations: {
          treatment_plan: [
            'No plant detected. Retake the scan with one aloe vera plant centered and fully visible.',
          ],
          preventive_measures: [],
          follow_up_required: true,
          next_scan_date: null,
        },
      };
    }

    // Determine primary disease/condition
    const primaryPrediction = yolo_predictions && yolo_predictions.length > 0
      ? yolo_predictions[0]
      : { class: 'healthy', confidence: 0.5 };
    const diseaseDetectedByKey = Boolean(diseaseKey && diseaseKey !== 'healthy');

    // Determine disease severity
    let diseaseSeverity = 'none';
    if (diseaseDetectedByKey || primaryPrediction.class !== 'healthy') {
      if (mlResults?.severity && ['high', 'medium', 'low'].includes(String(mlResults.severity).toLowerCase())) {
        const severityMap = { high: 'severe', medium: 'moderate', low: 'mild' };
        diseaseSeverity = severityMap[String(mlResults.severity).toLowerCase()] || 'moderate';
      } else
      if (primaryPrediction.confidence >= 0.8) {
        diseaseSeverity = 'severe';
      } else if (primaryPrediction.confidence >= 0.6) {
        diseaseSeverity = 'moderate';
      } else {
        diseaseSeverity = 'mild';
      }
    }

    // Calculate health score (0-100)
    let healthScore = 100;
    if (diseaseDetectedByKey || primaryPrediction.class !== 'healthy') {
      const penaltyBase = mlResults?.confidence ?? primaryPrediction.confidence;
      healthScore = Math.max(0, 100 - (Number(penaltyBase || 0.5) * 50));
    }
    
    // Adjust based on visual features
    const colorIndex = visual_features?.leaf_color_index || 0.5;
    healthScore = healthScore * (0.7 + colorIndex * 0.3);

    // Determine harvest readiness
    const maturityAssessment = this.mapMaturityAssessment(maturity_data?.maturity_stage, age_estimation?.maturity_assessment);
    const estimatedDays = this.mapEstimatedDaysToHarvest(maturity_data?.maturity_stage, age_estimation?.estimated_days_to_harvest);
    const stageText = String(maturity_data?.maturity_stage || '').toLowerCase();
    const harvestReady = stageText.includes('ready for harvest') || stageText.includes('mature');

    // Determine recommended action
    let recommendedAction = 'monitor_daily';
    if (diseaseSeverity !== 'none') {
      recommendedAction = 'treat_disease';
    } else if (harvestReady) {
      recommendedAction = 'harvest_now';
    } else if (maturityAssessment === 'maturing') {
      recommendedAction = 'wait_2_weeks';
    }

    // Generate recommendations
    return {
      leaf_count: Number(maturity_data?.leaf_count || 0),
      maturity_stage: maturity_data?.maturity_stage || null,
      harvest_ready: harvestReady,
      maturity_assessment: maturityAssessment,
      health_score: Math.round(healthScore),
      disease_detected: diseaseDetectedByKey || primaryPrediction.class !== 'healthy',
      disease_severity: diseaseSeverity,
      recommended_action: recommendedAction,
      estimated_days_to_harvest: estimatedDays,
      confidence_score: Number.isFinite(parsedConfidence) ? parsedConfidence : 0.5,
      recommendations: {
        treatment_plan: [],
        preventive_measures: [],
        follow_up_required: false,
        next_scan_date: null,
      },
    };
  }

  mapMaturityAssessment(maturityStage, fallback = 'maturing') {
    const stage = String(maturityStage || '').toLowerCase();
    if (stage.includes('no plant detected')) return 'immature';
    if (stage.includes('not ready')) return 'immature';
    if (stage.includes('young')) return 'immature';
    if (stage.includes('developing')) return 'maturing';
    if (stage.includes('ready for harvest')) return 'optimal';
    if (stage.includes('mature')) return 'optimal';
    return fallback || 'maturing';
  }

  mapEstimatedDaysToHarvest(maturityStage, fallbackDays) {
    const fallback = typeof fallbackDays === 'number' ? fallbackDays : 60;
    const stage = String(maturityStage || '').toLowerCase();
    if (stage.includes('no plant detected')) return null;
    if (stage.includes('not ready')) return 90;
    if (stage.includes('young')) return 90;
    if (stage.includes('developing')) return 21;
    if (stage.includes('ready for harvest')) return 0;
    if (stage.includes('mature')) return 0;
    return fallback;
  }

  /**
   * Generate treatment recommendations
   * @param {String} diseaseClass - Disease class name
   * @param {String} severity - Disease severity
   * @param {Object} ageEstimation - Age estimation results
   * @returns {Object} Recommendations
   */
  generateRecommendations(diseaseClass, severity, ageEstimation) {
    const recommendations = {
      treatment_plan: [],
      preventive_measures: [],
      follow_up_required: false,
      next_scan_date: null
    };

    // Set follow-up based on condition
    if (diseaseClass !== 'healthy') {
      recommendations.follow_up_required = true;
      const nextScan = new Date();
      if (severity === 'severe') {
        nextScan.setDate(nextScan.getDate() + 3); // Check in 3 days
      } else if (severity === 'moderate') {
        nextScan.setDate(nextScan.getDate() + 7); // Check in 1 week
      } else {
        nextScan.setDate(nextScan.getDate() + 14); // Check in 2 weeks
      }
      recommendations.next_scan_date = nextScan;
    } else if (ageEstimation?.maturity_assessment === 'maturing') {
      recommendations.follow_up_required = true;
      const nextScan = new Date();
      nextScan.setDate(nextScan.getDate() + 14); // Check in 2 weeks
      recommendations.next_scan_date = nextScan;
    }

    // Add general recommendations
    if (diseaseClass !== 'healthy') {
      recommendations.treatment_plan.push(
        `Treat ${diseaseClass.replace('_', ' ')} with appropriate treatment`
      );
      recommendations.treatment_plan.push('Monitor plant closely for improvement');
    }

    if (ageEstimation?.maturity_assessment === 'optimal') {
      recommendations.treatment_plan.push('Plant is ready for harvest');
    }

    recommendations.preventive_measures.push('Maintain proper watering schedule');
    recommendations.preventive_measures.push('Ensure adequate sunlight');
    recommendations.preventive_measures.push('Regular monitoring and inspection');

    return recommendations;
  }
}

module.exports = new MLService();
