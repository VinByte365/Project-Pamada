import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppData } from '../contexts/AppDataContext';
import AnimatedInView from '../components/common/AnimatedInView';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { colors, spacing, radius, typography, shadows } from '../theme';

const HistoryScreen = () => {
  const { scans } = useAppData();
  const [filter, setFilter] = useState('all');
  const [loading] = useState(false);

  const filters = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'healthy', label: 'Healthy', icon: 'checkmark-circle' },
    { id: 'leaf_spot', label: 'Leaf Spot', icon: 'warning' },
    { id: 'ready', label: 'Ready', icon: 'leaf' },
  ];

  const filteredScans = filter === 'all'
    ? scans
    : scans.filter((scan) => scan.status === filter);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return { label: 'Healthy', bg: '#E8F5E9', color: colors.successDark };
      case 'ready':
        return { label: 'Ready', bg: '#DCFCE7', color: colors.primaryDark };
      case 'leaf_spot':
        return { label: 'Leaf Spot', bg: '#FEF3C7', color: '#B45309' };
      case 'root_rot':
        return { label: 'Root Rot', bg: '#FEE2E2', color: '#B91C1C' };
      default:
        return { label: 'Unknown', bg: '#E5E7EB', color: colors.textMuted };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSubtitle}>Review plant maturity and health trends</Text>
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filterItem) => {
            const active = filter === filterItem.id;
            return (
              <TouchableOpacity
                key={filterItem.id}
                style={[styles.filterButton, active ? styles.filterButtonActive : styles.filterButtonInactive]}
                onPress={() => setFilter(filterItem.id)}
              >
                <Ionicons
                  name={filterItem.icon}
                  size={14}
                  color={active ? colors.white : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    active ? styles.filterButtonTextActive : styles.filterButtonTextInactive,
                  ]}
                >
                  {filterItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.scanListContainer}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            filteredScans.map((scan, index) => {
              const badge = getStatusBadge(scan.status);
              return (
                <AnimatedInView key={scan.id} delay={index * 60}>
                  <TouchableOpacity style={styles.scanCard} activeOpacity={0.85}>
                    <View style={styles.scanCardRow}>
                      <Image source={{ uri: scan.image }} style={styles.scanImage} />
                      <View style={styles.scanInfo}>
                        <View style={styles.scanHeader}>
                          <View>
                            <Text style={styles.scanName}>{scan.plantName}</Text>
                            <Text style={styles.scanDate}>
                              {scan.date} - {scan.time}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.maturityLabel}>Maturity</Text>
                        <View style={styles.maturityRow}>
                          <View style={styles.maturityBar}>
                            <View
                              style={[
                                styles.maturityFill,
                                { width: `${scan.maturityPercent}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.maturityText}>{scan.maturity}</Text>
                        </View>

                        {scan.diseases.length > 0 && (
                          <View style={styles.diseaseWarning}>
                            <Ionicons name="warning" size={14} color={colors.warning} />
                            <Text style={styles.diseaseText}>{scan.diseases.join(', ')}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.viewAnalysisButton}>
                      <Text style={styles.viewAnalysisText}>View Full Analysis</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                </AnimatedInView>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xxs,
  },
  filterContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  filterButtonInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterButtonText: {
    ...typography.caption,
    fontWeight: '700',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterButtonTextInactive: {
    color: colors.text.secondary,
  },
  scanListContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  scanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  scanCardRow: {
    flexDirection: 'row',
  },
  scanImage: {
    width: 82,
    height: 82,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  scanInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scanName: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  scanDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  maturityLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  maturityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maturityBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  maturityFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  maturityText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
    minWidth: 40,
  },
  diseaseWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  diseaseText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  viewAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewAnalysisText: {
    ...typography.bodyBold,
    color: colors.primary,
    marginRight: spacing.xs,
  },
});