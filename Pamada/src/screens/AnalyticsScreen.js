import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../contexts/AppDataContext';
import AnimatedInView from '../components/common/AnimatedInView';
import { colors, spacing, radius, typography, shadows } from '../theme';

export default function AnalyticsScreen() {
  const { analytics } = useAppData();

  const diseases = [
    { name: 'Leaf Spot', percentage: 5, color: '#F59E0B' },
    { name: 'Root Rot', percentage: 2, color: '#EF4444' },
    { name: 'Sunburn', percentage: 1, color: '#FB923C' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <AnimatedInView>
            <Text style={styles.title}>Farm Analytics</Text>
          </AnimatedInView>

          <AnimatedInView delay={80}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, styles.statIconWrapperEmerald]}>
                  <Ionicons name="leaf" size={18} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{analytics.totalPlants}</Text>
                <Text style={styles.statLabel}>Total Plants</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, styles.statIconWrapperEmerald]}>
                  <Ionicons name="trending-up" size={18} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{analytics.harvestRate}</Text>
                <Text style={styles.statLabel}>Harvest Rate</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, styles.statIconWrapperAmber]}>
                  <Ionicons name="warning" size={18} color={colors.warning} />
                </View>
                <Text style={styles.statValue}>{analytics.diseaseRate}</Text>
                <Text style={styles.statLabel}>Disease Rate</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, styles.statIconWrapperBlue]}>
                  <Ionicons name="analytics" size={18} color="#2563EB" />
                </View>
                <Text style={styles.statValue}>{analytics.avgMaturity}</Text>
                <Text style={styles.statLabel}>Avg. Maturity</Text>
              </View>
            </View>
          </AnimatedInView>

          <AnimatedInView delay={150}>
            <View style={styles.predictionCard}>
              <View style={styles.predictionHeader}>
                <Ionicons name="bulb" size={22} color={colors.white} />
                <Text style={styles.predictionTitle}>AI Prediction</Text>
              </View>
              <Text style={styles.predictionText}>{analytics.prediction}</Text>
              <Text style={styles.predictionSubtext}>{analytics.growthNote}</Text>
            </View>
          </AnimatedInView>

          <AnimatedInView delay={220}>
            <View style={styles.diseaseCard}>
              <Text style={styles.diseaseTitle}>Disease Distribution</Text>

              {diseases.map((disease, index) => (
                <View
                  key={disease.name}
                  style={[styles.diseaseItem, index === diseases.length - 1 && styles.diseaseItemLast]}
                >
                  <View style={styles.diseaseHeader}>
                    <Text style={styles.diseaseName}>{disease.name}</Text>
                    <Text style={styles.diseasePercent}>{disease.percentage}%</Text>
                  </View>
                  <View style={styles.diseaseBar}>
                    <View
                      style={[
                        styles.diseaseFill,
                        {
                          width: `${disease.percentage * 10}%`,
                          backgroundColor: disease.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </AnimatedInView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statIconWrapperEmerald: {
    backgroundColor: '#ECFDF5',
  },
  statIconWrapperAmber: {
    backgroundColor: '#FFFBEB',
  },
  statIconWrapperBlue: {
    backgroundColor: '#EFF6FF',
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  predictionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  predictionTitle: {
    ...typography.bodyBold,
    color: colors.white,
  },
  predictionText: {
    ...typography.title,
    color: colors.white,
    marginTop: spacing.sm,
  },
  predictionSubtext: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xxs,
  },
  diseaseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  diseaseTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  diseaseItem: {
    marginBottom: spacing.md,
  },
  diseaseItemLast: {
    marginBottom: 0,
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  diseaseName: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  diseasePercent: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  diseaseBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  diseaseFill: {
    height: '100%',
    borderRadius: 3,
  },
});