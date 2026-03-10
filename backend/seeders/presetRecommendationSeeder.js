const Disease = require('../models/disease');
const Recommendation = require('../models/recommendation');

const presetSeed = [
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
    disease_key: 'leaf_spot',
    display_name: 'Leaf Spot',
    description: 'Fungal spotting on leaves that weakens aloe tissue over time.',
    recommendations: [
      { recommendation_text: 'Remove and discard infected leaves using sterilized shears', priority: 'high', is_required: true },
      { recommendation_text: 'Avoid overhead watering and keep leaf surfaces dry', priority: 'high', is_required: true },
      { recommendation_text: 'Improve airflow around the plant and reduce humidity', priority: 'medium', is_required: true },
      { recommendation_text: 'Apply a broad-spectrum fungicide to affected and nearby leaves', priority: 'medium', is_required: true },
      { recommendation_text: 'Disinfect tools and nearby surfaces after pruning', priority: 'medium', is_required: false },
      { recommendation_text: 'Schedule a follow-up scan in 3-5 days to track spread', priority: 'medium', is_required: true },
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
      { recommendation_text: 'Delay watering for 48-72 hours after repotting to allow root wounds to seal', priority: 'medium', is_required: true },
      { recommendation_text: 'Recheck leaf firmness and soil moisture daily for one week', priority: 'low', is_required: false },
    ],
  },
  {
    disease_key: 'sunburn',
    display_name: 'Sunburn',
    description: 'Light or heat damage from excessive direct sunlight.',
    recommendations: [
      { recommendation_text: 'Move the plant to bright shade or filtered light immediately', priority: 'high', is_required: true },
      { recommendation_text: 'Remove severely scorched leaves once tissue is dry', priority: 'medium', is_required: true },
      { recommendation_text: 'Increase hydration slightly while avoiding waterlogging', priority: 'medium', is_required: true },
      { recommendation_text: 'Reintroduce sun exposure gradually over 7-10 days', priority: 'medium', is_required: true },
      { recommendation_text: 'Avoid midday sun until new growth looks stable', priority: 'low', is_required: false },
    ],
  },
  {
    disease_key: 'aloe_rust',
    display_name: 'Aloe Rust',
    description: 'Fungal disease that produces orange-brown pustules on leaves.',
    recommendations: [
      { recommendation_text: 'Remove leaves with visible rust pustules using sterilized tools', priority: 'high', is_required: true },
      { recommendation_text: 'Increase airflow and reduce humidity around the plant', priority: 'medium', is_required: true },
      { recommendation_text: 'Apply a targeted fungicide according to label directions', priority: 'medium', is_required: true },
      { recommendation_text: 'Disinfect tools and isolate the plant from healthy stock', priority: 'medium', is_required: true },
      { recommendation_text: 'Rescan in 3-5 days to confirm containment', priority: 'low', is_required: true },
    ],
  },
  {
    disease_key: 'bacterial_soft_rot',
    display_name: 'Bacterial Soft Rot',
    description: 'Rapid tissue decay caused by bacterial infection and excess moisture.',
    recommendations: [
      { recommendation_text: 'Isolate the plant to prevent spread', priority: 'high', is_required: true },
      { recommendation_text: 'Remove all soft or mushy tissue with sterilized tools', priority: 'high', is_required: true },
      { recommendation_text: 'Apply a copper-based bactericide to exposed tissue', priority: 'high', is_required: true },
      { recommendation_text: 'Reduce watering and improve drainage immediately', priority: 'medium', is_required: true },
      { recommendation_text: 'Sanitize tools, pots, and nearby surfaces', priority: 'medium', is_required: true },
      { recommendation_text: 'Rescan in 2-3 days to confirm symptoms are stabilizing', priority: 'medium', is_required: true },
    ],
  },
  {
    disease_key: 'anthracnose',
    display_name: 'Anthracnose',
    description: 'Fungal disease that causes dark, sunken lesions and spotting.',
    recommendations: [
      { recommendation_text: 'Prune infected leaves and dispose of them safely', priority: 'high', is_required: true },
      { recommendation_text: 'Keep foliage dry and avoid overhead watering', priority: 'medium', is_required: true },
      { recommendation_text: 'Improve airflow around the plant and reduce humidity', priority: 'medium', is_required: true },
      { recommendation_text: 'Apply a systemic fungicide per label instructions', priority: 'medium', is_required: true },
      { recommendation_text: 'Monitor for new lesions and rescan within 4 days', priority: 'low', is_required: true },
    ],
  },
  {
    disease_key: 'scale_insect',
    display_name: 'Scale Insect',
    description: 'Sap-sucking pests that appear as hard bumps on leaves or stems.',
    recommendations: [
      { recommendation_text: 'Isolate the plant and inspect nearby plants', priority: 'high', is_required: true },
      { recommendation_text: 'Remove visible scale with alcohol-dipped cotton swabs', priority: 'high', is_required: true },
      { recommendation_text: 'Apply horticultural oil or insecticidal soap thoroughly', priority: 'medium', is_required: true },
      { recommendation_text: 'Repeat treatment every 5-7 days until no new scale appear', priority: 'medium', is_required: true },
      { recommendation_text: 'Clean leaves and sanitize tools after treatment', priority: 'low', is_required: false },
    ],
  },
  {
    disease_key: 'mealybug',
    display_name: 'Mealybug',
    description: 'Cottony, sap-feeding pests that weaken new growth.',
    recommendations: [
      { recommendation_text: 'Isolate the plant and inspect leaf joints and roots', priority: 'high', is_required: true },
      { recommendation_text: 'Remove mealybugs with alcohol swabs or a strong water spray', priority: 'high', is_required: true },
      { recommendation_text: 'Apply insecticidal soap or neem oil to all surfaces', priority: 'medium', is_required: true },
      { recommendation_text: 'Repeat treatment every 5-7 days until clear', priority: 'medium', is_required: true },
      { recommendation_text: 'Rescan after one week to confirm eradication', priority: 'low', is_required: true },
    ],
  },
  {
    disease_key: 'spider_mite',
    display_name: 'Spider Mite',
    description: 'Tiny pests that cause stippling and fine webbing on leaves.',
    recommendations: [
      { recommendation_text: 'Increase humidity and rinse leaves with clean water', priority: 'high', is_required: true },
      { recommendation_text: 'Apply miticide or insecticidal soap to leaf undersides', priority: 'high', is_required: true },
      { recommendation_text: 'Isolate the plant and remove heavily infested leaves', priority: 'medium', is_required: true },
      { recommendation_text: 'Repeat treatment every 3-5 days until mites are gone', priority: 'medium', is_required: true },
      { recommendation_text: 'Rescan within a week to confirm control', priority: 'low', is_required: true },
    ],
  },
  {
    disease_key: 'fungal_infection',
    display_name: 'Fungal Infection',
    description: 'Legacy fungal grouping kept for backward compatibility.',
    recommendations: [
      { recommendation_text: 'Move plant to a dry, well-ventilated area for 48 hours', priority: 'high', is_required: true },
      { recommendation_text: 'Reduce watering frequency and allow top 2-3 cm of soil to dry before next watering', priority: 'high', is_required: true },
      { recommendation_text: 'Prune visibly infected leaves with sterilized shears', priority: 'high', is_required: true },
      { recommendation_text: 'Apply broad-spectrum antifungal spray to affected and nearby leaves', priority: 'high', is_required: true },
      { recommendation_text: 'Disinfect tools and surrounding surfaces to prevent cross-contamination', priority: 'medium', is_required: true },
      { recommendation_text: 'Schedule follow-up scan after 3-5 days to assess lesion spread', priority: 'medium', is_required: true },
    ],
  },
  {
    disease_key: 'bacterial_spot',
    display_name: 'Bacterial Spot',
    description: 'Legacy bacterial grouping kept for backward compatibility.',
    recommendations: [
      { recommendation_text: 'Isolate affected plant from healthy stock immediately', priority: 'high', is_required: true },
      { recommendation_text: 'Remove and safely discard infected leaves; do not compost', priority: 'high', is_required: true },
      { recommendation_text: 'Sanitize tools, gloves, benches, and watering equipment', priority: 'high', is_required: true },
      { recommendation_text: 'Apply copper-based bactericide according to label schedule', priority: 'high', is_required: true },
      { recommendation_text: 'Switch to base watering only; keep leaf surfaces dry', priority: 'medium', is_required: true },
      { recommendation_text: 'Run follow-up scan in 3 days to verify spread control', priority: 'medium', is_required: true },
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
