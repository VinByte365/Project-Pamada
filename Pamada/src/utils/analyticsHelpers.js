const toPercentNumber = (value) => {
  const numeric = Number(String(value ?? 0).replace('%', '').trim());
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

export function buildAnalyticsMetrics(analytics, palette) {
  return [
    {
      key: 'harvest',
      label: 'Harvest Rate',
      value: toPercentNumber(analytics?.harvestRate),
      icon: 'leaf-outline',
      tint: palette.primary.solid,
    },
    {
      key: 'disease',
      label: 'Disease Rate',
      value: toPercentNumber(analytics?.diseaseRate),
      icon: 'warning-outline',
      tint: palette.status.warning,
    },
    {
      key: 'maturity',
      label: 'Avg Maturity',
      value: toPercentNumber(analytics?.avgMaturity),
      icon: 'analytics-outline',
      tint: palette.status.watering,
    },
  ];
}

export function buildProfileMetrics(analytics, palette) {
  return [
    {
      key: 'harvest',
      label: 'Harvest Rate',
      value: toPercentNumber(analytics?.harvestRate),
      icon: 'leaf-outline',
      tint: palette.accent.action,
    },
    {
      key: 'disease',
      label: 'Disease Rate',
      value: toPercentNumber(analytics?.diseaseRate),
      icon: 'warning-outline',
      tint: palette.status.warning,
    },
    {
      key: 'maturity',
      label: 'Avg Maturity',
      value: toPercentNumber(analytics?.avgMaturity),
      icon: 'analytics-outline',
      tint: palette.status.watering,
    },
  ];
}

export function getDiseaseDistribution(analytics, fallbackList) {
  if (Array.isArray(analytics?.diseaseDistribution) && analytics.diseaseDistribution.length) {
    return analytics.diseaseDistribution.map((item) => ({
      ...item,
      percentage: toPercentNumber(item?.percentage),
    }));
  }
  return fallbackList;
}
