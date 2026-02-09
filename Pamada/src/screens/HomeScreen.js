import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import ScreenContainer from '../components/common/ScreenContainer';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { SkeletonStatCard, SkeletonCard } from '../components/common/SkeletonLoader';
import AnimatedInView from '../components/common/AnimatedInView';
import {
  colors,
  spacing,
  typography,
  radius,
  dimensions,
  shadows,
  textStyles,
} from '../theme';

const SECTION_GAP = spacing.sectionGap;
const CARD_GAP = spacing.sm;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { stats, recentScans, dailyTip } = useAppData();
  const [loading] = useState(false);

  const quickActions = [
    { title: 'Scan Plant', icon: 'camera', screen: 'Scan' },
    { title: 'View History', icon: 'time', screen: 'History' },
    { title: 'Analytics', icon: 'analytics', screen: 'Analytics' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return colors.success;
      case 'leaf_spot':
        return colors.warning;
      case 'ready':
        return colors.primary;
      case 'root_rot':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'leaf_spot':
        return 'Leaf Spot';
      case 'ready':
        return 'Ready to Harvest';
      case 'root_rot':
        return 'Root Rot';
      default:
        return 'Unknown';
    }
  };

  const displayName = user?.full_name?.split(' ')[0] || 'Farmer';

  return (
    <ScreenContainer padding={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedInView style={styles.greeting}>
          <Text style={styles.greetingTitle}>Hello, {displayName}</Text>
          <Text style={styles.greetingSubtitle}>Aloe Vera Farm Dashboard</Text>
        </AnimatedInView>

        <AnimatedInView delay={50}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          {loading ? (
            <View style={styles.statsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonStatCard key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <Card key={index} padding="medium" style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name={stat.icon} size={22} color={colors[stat.tone] || colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </Card>
              ))}
            </View>
          )}
        </AnimatedInView>

        <AnimatedInView delay={120}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.7}
                accessibilityLabel={action.title}
                accessibilityRole="button"
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedInView>

        <AnimatedInView delay={200}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('History')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : recentScans.length === 0 ? (
            <Card padding="medium">
              <EmptyState
                icon="camera-outline"
                title="No scans yet"
                subtitle="Scan your first Aloe Vera plant to see results here."
                actionLabel="Scan Plant"
                onAction={() => navigation.navigate('Scan')}
              />
            </Card>
          ) : (
            recentScans.map((scan) => (
              <Card
                key={scan.id}
                onPress={() => navigation.navigate('History')}
                padding="medium"
                style={styles.scanCard}
              >
                <View style={styles.scanRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(scan.status) }]} />
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanName}>{scan.plantName}</Text>
                    <Text style={styles.scanDate}>{scan.date}</Text>
                  </View>
                  <View style={styles.scanRight}>
                    <Text style={[styles.scanStatus, { color: getStatusColor(scan.status) }]}>
                      {getStatusText(scan.status)}
                    </Text>
                    <Text style={styles.scanMaturity}>{scan.maturity}</Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </AnimatedInView>

        <AnimatedInView delay={260}>
          <Card variant="success" padding="medium" style={styles.tipCard}>
            <View style={styles.tipRow}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="bulb-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Daily Tip</Text>
                <Text style={styles.tipText}>{dailyTip}</Text>
              </View>
            </View>
          </Card>
        </AnimatedInView>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    marginBottom: SECTION_GAP,
  },
  greetingTitle: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  greetingSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAll: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SECTION_GAP,
  },
  statCard: {
    width: dimensions.width < 375 ? '48%' : '48%',
    minWidth: 0,
    marginBottom: CARD_GAP,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SECTION_GAP,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: textStyles.caption.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  scanCard: {
    marginBottom: CARD_GAP,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  scanInfo: {
    flex: 1,
    minWidth: 0,
  },
  scanName: {
    fontSize: textStyles.bodyBold.fontSize,
    fontWeight: textStyles.bodyBold.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  scanDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  scanRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.xs,
  },
  scanStatus: {
    ...typography.caption,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  scanMaturity: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tipCard: {
    marginTop: spacing.md,
    marginBottom: 0,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIconWrap: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodyBold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  tipText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
