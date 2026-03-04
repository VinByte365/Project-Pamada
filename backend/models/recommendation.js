const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    disease_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disease',
      required: true,
      index: true,
    },
    recommendation_text: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      default: 'medium',
      index: true,
    },
    is_required: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'recommendations',
  }
);

module.exports = mongoose.model('Recommendation', recommendationSchema);
