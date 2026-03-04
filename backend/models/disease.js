const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema(
  {
    disease_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'diseases',
  }
);

module.exports = mongoose.model('Disease', diseaseSchema);
