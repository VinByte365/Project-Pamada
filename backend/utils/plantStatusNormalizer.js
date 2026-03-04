const ALLOWED_CONDITIONS = new Set([
  'healthy',
  'leaf_spot',
  'root_rot',
  'sunburn',
  'aloe_rust',
  'bacterial_soft_rot',
  'anthracnose',
  'scale_insect',
  'mealybug',
  'spider_mite',
]);

const ALLOWED_SEVERITY = new Set(['none', 'mild', 'moderate', 'severe']);

const CONDITION_ALIAS = {
  fungal_disease: 'leaf_spot',
  fungus: 'leaf_spot',
  rust: 'aloe_rust',
  rot: 'root_rot',
  insect: 'scale_insect',
};

const SEVERITY_ALIAS = {
  low: 'mild',
  medium: 'moderate',
  high: 'severe',
  critical: 'severe',
};

function normalizePrimaryCondition(rawValue, fallback = 'healthy') {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value) return fallback;
  if (ALLOWED_CONDITIONS.has(value)) return value;
  if (CONDITION_ALIAS[value] && ALLOWED_CONDITIONS.has(CONDITION_ALIAS[value])) {
    return CONDITION_ALIAS[value];
  }
  return fallback;
}

function normalizeDiseaseSeverity(rawValue, fallback = 'none') {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!value) return fallback;
  if (ALLOWED_SEVERITY.has(value)) return value;
  if (SEVERITY_ALIAS[value] && ALLOWED_SEVERITY.has(SEVERITY_ALIAS[value])) {
    return SEVERITY_ALIAS[value];
  }
  return fallback;
}

module.exports = {
  normalizePrimaryCondition,
  normalizeDiseaseSeverity,
};
