const Disease = require('../models/disease');
const Recommendation = require('../models/recommendation');

const presetSeed = [
  {
    disease_key: 'fungal_infection',
    display_name: 'Fungal Infection',
    description: 'Fungal growth on leaves or roots that weakens aloe tissue and slows growth.',
    recommendations: [
      { recommendation_text: 'Move plant to a dry, well-ventilated area for 48 hours', priority: 'high', is_required: true },
      { recommendation_text: 'Reduce watering frequency and allow top 2-3 cm of soil to dry before next watering', priority: 'high', is_required: true },
      { recommendation_text: 'Prune visibly infected leaves with sterilized shears', priority: 'high', is_required: true },
      { recommendation_text: 'Apply broad-spectrum antifungal spray to affected and nearby leaves', priority: 'high', is_required: true },
      { recommendation_text: 'Disinfect tools and surrounding surfaces to prevent cross-contamination', priority: 'medium', is_required: true },
      { recommendation_text: 'Replace wet mulch or contaminated topsoil around the plant base', priority: 'medium', is_required: false },
      { recommendation_text: 'Schedule follow-up scan after 3-5 days to assess lesion spread', priority: 'medium', is_required: true },
      { recommendation_text: 'Log symptom changes daily (spot size, color, and number of affected leaves)', priority: 'low', is_required: false },
    ],
  },
  {
    disease_key: 'root_rot',
    display_name: 'Root Rot',
    description: 'Excess moisture and pathogens cause roots to soften and decay.',
    recommendations: [
      { recommendation_text: 'Stop watering immediately and move pot to a warm, ventilated location', priority: 'high', is_required: true },
      { recommendation_text: 'Unpot the plant and inspect root system for dark, mushy tissue', priority: 'high', is_required: true },
      { recommendation_text: 'Trim all rotten roots using sterilized blades', priority: 'high', is_required: true },
      { recommendation_text: 'Dust trimmed root zones with fungicidal powder before repotting', priority: 'high', is_required: true },
      { recommendation_text: 'Repot in sterile, fast-draining cactus/succulent mix', priority: 'high', is_required: true },
      { recommendation_text: 'Use a container with unobstructed drainage holes', priority: 'medium', is_required: true },
      { recommendation_text: 'Delay watering for 48-72 hours after repotting to allow root wounds to seal', priority: 'medium', is_required: true },
      { recommendation_text: 'Recheck leaf firmness and soil moisture daily for one week', priority: 'low', is_required: false },
    ],
  },
  {
    disease_key: 'bacterial_spot',
    display_name: 'Bacterial Spot',
    description: 'Bacterial lesions on leaves that can spread in warm and wet environments.',
    recommendations: [
      { recommendation_text: 'Isolate affected plant from healthy stock immediately', priority: 'high', is_required: true },
      { recommendation_text: 'Remove and safely discard infected leaves; do not compost', priority: 'high', is_required: true },
      { recommendation_text: 'Sanitize tools, gloves, benches, and watering equipment', priority: 'high', is_required: true },
      { recommendation_text: 'Apply copper-based bactericide according to label schedule', priority: 'high', is_required: true },
      { recommendation_text: 'Switch to base watering only; keep leaf surfaces dry', priority: 'medium', is_required: true },
      { recommendation_text: 'Increase spacing between nearby plants to reduce humidity pockets', priority: 'medium', is_required: false },
      { recommendation_text: 'Inspect adjacent plants for early lesions and mark suspects', priority: 'medium', is_required: true },
      { recommendation_text: 'Run follow-up scan in 3 days to verify spread control', priority: 'medium', is_required: true },
    ],
  },
  {
    disease_key: 'healthy',
    display_name: 'Healthy Condition',
    description: 'Plant appears healthy with no actionable disease detected.',
    recommendations: [
      { recommendation_text: 'Maintain current watering schedule and avoid waterlogging', priority: 'medium', is_required: true },
      { recommendation_text: 'Rotate plant orientation weekly for even sunlight exposure', priority: 'low', is_required: false },
      { recommendation_text: 'Inspect leaves and crown every 2-3 days for early signs of stress', priority: 'medium', is_required: true },
      { recommendation_text: 'Clean lower leaves and remove dry debris around the base', priority: 'low', is_required: false },
      { recommendation_text: 'Capture a routine health scan next week for trend monitoring', priority: 'medium', is_required: true },
    ],
  },
  {
    disease_key: 'unknown_condition',
    display_name: 'Unclassified Condition',
    description: 'The scan could not confidently map to a known preset disease class.',
    recommendations: [
      { recommendation_text: 'Move plant to observation area and isolate from vulnerable plants', priority: 'high', is_required: true },
      { recommendation_text: 'Retake scan in bright natural light with whole plant centered', priority: 'high', is_required: true },
      { recommendation_text: 'Capture close-up photos of lesions/spots for manual review', priority: 'medium', is_required: true },
      { recommendation_text: 'Avoid overwatering and keep canopy dry until diagnosis is clearer', priority: 'medium', is_required: true },
      { recommendation_text: 'Perform manual inspection of root base, leaf underside, and crown', priority: 'medium', is_required: true },
      { recommendation_text: 'If symptoms worsen, apply broad preventive fungicide/bactericide cautiously', priority: 'low', is_required: false },
    ],
  },
];

async function seedPresetRecommendations() {
  const diseaseIds = [];
  try {
    for (const diseaseSeed of presetSeed) {
      const disease = await Disease.findOneAndUpdate(
        { disease_key: diseaseSeed.disease_key },
        {
          $set: {
            disease_key: diseaseSeed.disease_key,
            display_name: diseaseSeed.display_name,
            description: diseaseSeed.description,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      diseaseIds.push(disease._id);
      await Recommendation.deleteMany({ disease_id: disease._id });
      await Recommendation.insertMany(
        diseaseSeed.recommendations.map((item) => ({
          disease_id: disease._id,
          recommendation_text: item.recommendation_text,
          priority: item.priority,
          is_required: item.is_required,
        }))
      );
    }

    // Optional cleanup for removed presets.
    await Disease.deleteMany({ _id: { $nin: diseaseIds } });
    await Recommendation.deleteMany({ disease_id: { $nin: diseaseIds } });
  } catch (error) {
    console.error('Failed to seed preset recommendations:', error);
    throw error;
  }
}

module.exports = {
  seedPresetRecommendations,
  presetSeed,
};
