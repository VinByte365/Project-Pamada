const mongoose = require('mongoose');

const recommendationLogSchema = new mongoose.Schema(
  {
    plant_scan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlantScan',
      required: true,
      index: true,
    },
    recommendation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recommendation',
      required: true,
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'recommendation_logs',
  }
);

recommendationLogSchema.index({ plant_scan_id: 1, recommendation_id: 1 }, { unique: true });

module.exports = mongoose.model('RecommendationLog', recommendationLogSchema);
