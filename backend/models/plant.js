const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  plant_id: {
    type: String,
    unique: true,
    index: true
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planting_date: {
    type: Date,
    required: true
  },
  location: {
    farm_name: String,
    plot_number: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  current_status: {
    health_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    harvest_ready: {
      type: Boolean,
      default: false
    },
    last_scan_date: Date,
    primary_condition: {
      type: String,
      enum: ['healthy', 'leaf_spot', 'root_rot', 'sunburn', 'aloe_rust', 
             'bacterial_soft_rot', 'anthracnose', 'scale_insect']
    },
    disease_severity: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe'],
      default: 'none'
    },
    estimated_days_to_harvest: Number
  },
  metadata: {
    variety: {
      type: String,
      default: 'Aloe barbadensis Miller'
    },
    propagation_method: {
      type: String,
      enum: ['in-vitro', 'vegetative', 'seed']
    },
    soil_type: String,
    notes: String
  }
}, {
  timestamps: true
});

// Virtual field for age calculation
plantSchema.virtual('age_in_months').get(function() {
  const now = new Date();
  const planted = new Date(this.planting_date);
  const months = (now.getFullYear() - planted.getFullYear()) * 12 + 
                  (now.getMonth() - planted.getMonth());
  return months;
});

// Generate unique plant ID
plantSchema.pre('save', async function(next) {
  if (!this.plant_id) {
    const count = await mongoose.model('Plant').countDocuments();
    const year = new Date().getFullYear();
    this.plant_id = `ALV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

plantSchema.set('toJSON', { virtuals: true });
plantSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Plant', plantSchema);
