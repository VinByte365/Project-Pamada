const mongoose = require('mongoose');

const plantScanSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plant',
      required: true,
      index: true,
    },
    disease_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disease',
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      default: 'medium',
      index: true,
    },
    scanned_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    legacy_scan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      default: null,
      index: true,
    },
    care_plan_completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    care_plan_completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'plant_scans',
  }
);

plantScanSchema.index({ user_id: 1, scanned_at: -1 });
plantScanSchema.index({ plant_id: 1, scanned_at: -1 });

module.exports = mongoose.model('PlantScan', plantScanSchema);
