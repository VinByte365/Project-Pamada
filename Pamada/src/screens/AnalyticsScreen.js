import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AnimatedInView from '../components/common/AnimatedInView';
import ElevatedCard from '../components/ui/ElevatedCard';
import ProgressRing from '../components/ui/ProgressRing';
import StatusBadge from '../components/ui/StatusBadge';
import useAppTheme from '../theme/useAppTheme';
import { spacing, typography } from '../theme';
import { useAppData } from '../contexts/AppDataContext';

export default function AnalyticsScreen() {
  const { palette } = useAppTheme();
  const { analytics, loading } = useAppData();

  const diseases = analytics.diseaseDistribution?.length
    ? analytics.diseaseDistribution
    : [
        { name: 'Leaf Spot', percentage: 0, color: palette.status.warning },
        { name: 'Root Rot', percentage: 0, color: palette.status.danger },
        { name: 'Sunburn', percentage: 0, color: palette.accent.action },
      ];

  const metrics = [
    {
      key: 'harvest',
      label: 'Harvest Rate',
      value: Number(String(analytics.harvestRate || '0').replace('%', '')),
      icon: 'leaf-outline',
      tint: palette.primary.solid,
    },
    {
      key: 'disease',
      label: 'Disease Rate',
      value: Number(String(analytics.diseaseRate || '0').replace('%', '')),
      icon: 'warning-outline',
      tint: palette.status.warning,
    },
    {
      key: 'maturity',
      label: 'Avg Maturity',
      value: Number(String(analytics.avgMaturity || '0').replace('%', '')),
      icon: 'analytics-outline',
      tint: palette.status.watering,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AnimatedInView>
          <Text style={[styles.kicker, { color: palette.text.secondary }]}>Farm Intelligence</Text>
          <Text style={[styles.title, { color: palette.text.primary }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>Actionable trends for harvesting, risk control, and care planning.</Text>
        </AnimatedInView>

        <AnimatedInView delay={60}>
          <ElevatedCard style={styles.topCard} floating>
            <View style={styles.topCardHeader}>
              <Text style={[styles.topCardTitle, { color: palette.text.primary }]}>Active Plant Summary</Text>
              <StatusBadge status="healthy" label={`${loading ? '...' : analytics.totalPlants} Plants`} />
            </View>

            <View style={styles.ringsRow}>
              {metrics.map((metric) => (
                <View key={metric.key} style={styles.ringItem}>
                  <ProgressRing progress={loading ? 0 : metric.value} tint={metric.tint} label={metric.label} />
                  <View style={styles.metricIconWrap}>
                    <Ionicons name={metric.icon} size={14} color={metric.tint} />
                  </View>
                </View>
              ))}
            </View>
          </ElevatedCard>
        </AnimatedInView>

        <AnimatedInView delay={120}>
          <ElevatedCard style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Ionicons name="sparkles-outline" size={18} color={palette.accent.action} />
              <Text style={[styles.predictionTitle, { color: palette.text.primary }]}>AI Prediction</Text>
            </View>
            <Text style={[styles.predictionText, { color: palette.text.primary }]}>
              {loading ? 'Loading prediction...' : analytics.prediction}
            </Text>
            <Text style={[styles.predictionSubtext, { color: palette.text.secondary }]}>
              {loading ? 'Analyzing trendline...' : analytics.growthNote}
            </Text>
          </ElevatedCard>
        </AnimatedInView>

        <AnimatedInView delay={180}>
          <ElevatedCard style={styles.distributionCard}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Disease Distribution</Text>
            <View style={styles.distributionList}>
              {diseases.map((disease) => (
                <View key={disease.name} style={styles.distItem}>
                  <View style={styles.distHead}>
                    <Text style={[styles.distName, { color: palette.text.secondary }]}>{disease.name}</Text>
                    <Text style={[styles.distValue, { color: palette.text.primary }]}>{disease.percentage}%</Text>
                  </View>
                  <View style={[styles.distBar, { backgroundColor: palette.surface.soft }]}>
                    <View
                      style={[
                        styles.distFill,
                        {
                          width: `${Math.min(Math.max(disease.percentage, 0), 100)}%`,
                          backgroundColor: disease.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ElevatedCard>
        </AnimatedInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  kicker: {
    ...typography.caption,
  },
  title: {
    ...typography.headline,
    marginTop: spacing.xxs,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  topCard: {
    padding: spacing.md,
  },
  topCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  topCardTitle: {
    ...typography.bodyBold,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ringItem: {
    alignItems: 'center',
    position: 'relative',
  },
  metricIconWrap: {
    position: 'absolute',
    top: -4,
    right: 4,
  },
  predictionCard: {
    padding: spacing.md,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  predictionTitle: {
    ...typography.bodyBold,
  },
  predictionText: {
    ...typography.title,
  },
  predictionSubtext: {
    ...typography.body,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  distributionCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  distributionList: {
    gap: spacing.sm,
  },
  distItem: {
    gap: spacing.xs,
  },
  distHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distName: {
    ...typography.caption,
  },
  distValue: {
    ...typography.caption,
    fontWeight: '700',
  },
  distBar: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 99,
  },
});
