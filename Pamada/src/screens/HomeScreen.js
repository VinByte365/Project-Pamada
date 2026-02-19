import React, { useMemo, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../components/common/ScreenContainer';
import AnimatedInView from '../components/common/AnimatedInView';
import EmptyState from '../components/common/EmptyState';
import ElevatedCard from '../components/ui/ElevatedCard';
import FloatingActionButton from '../components/ui/FloatingActionButton';
import PillFilterChip from '../components/ui/PillFilterChip';
import ProgressRing from '../components/ui/ProgressRing';
import StatusBadge from '../components/ui/StatusBadge';
import WeatherWidget from '../components/ui/WeatherWidget';
import NotificationFab from '../components/community/NotificationFab';
import useAppTheme from '../theme/useAppTheme';
import { radius, spacing, typography } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';

const segmentOptions = [
  { id: 'today', label: 'Today', icon: 'today-outline' },
  { id: 'priority', label: 'Priority', icon: 'flash-outline' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
];

const heroGif = require('../../assets/GIF_Aloegarve_-_crop_image_647_x_562_px-ezgif.com-reverse.gif');

export default function HomeScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { user } = useAuth();
  const { recentScans, stats, dailyTip } = useAppData();
  const [segment, setSegment] = useState('today');

  const displayName = user?.full_name?.split(' ')[0] || 'Grower';
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const dashboardMetrics = useMemo(() => {
    const total = Number(stats?.[0]?.value || 0);
    const healthy = Number(stats?.[1]?.value || 0);
    const risk = Number(stats?.[2]?.value || 0);
    const ready = Number(stats?.[3]?.value || 0);
    const healthyRate = total > 0 ? (healthy / total) * 100 : 0;
    const riskRate = total > 0 ? (risk / total) * 100 : 0;
    const readyRate = total > 0 ? (ready / total) * 100 : 0;

    return {
      healthyRate,
      riskRate,
      readyRate,
      overdueTasks: Math.max(1, Math.min(4, risk || 1)),
      completedToday: Math.max(1, Math.min(8, healthy || 2)),
    };
  }, [stats]);

  const tasks = useMemo(() => {
    const base = [
      {
        id: 'watering',
        title: 'Watering Window',
        subtitle: '2 plants due this morning',
        status: 'watering',
        priority: 'priority',
      },
      {
        id: 'scan',
        title: 'Health Check Scan',
        subtitle: 'Run quick AI diagnosis',
        status: 'ready',
        priority: 'today',
      },
      {
        id: 'nutrition',
        title: 'Nutrient Refresh',
        subtitle: 'Apply diluted feed in 2 days',
        status: 'healthy',
        priority: 'upcoming',
      },
    ];

    if (segment === 'today') return base.filter((item) => item.priority !== 'upcoming');
    if (segment === 'priority') return base.filter((item) => item.priority === 'priority');
    return base;
  }, [segment]);

  return (
    <ScreenContainer padding={false}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AnimatedInView>
            <ImageBackground
              source={heroGif}
              style={styles.heroCard}
              imageStyle={styles.heroImage}
            >
              <View style={[styles.heroOverlay, { backgroundColor: `${palette.background.base}DD` }]}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTopActions}>
                    <TouchableOpacity
                      style={[styles.headerIconWrap, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}
                      onPress={() => navigation.navigate('Messages')}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={19} color={palette.text.primary} />
                    </TouchableOpacity>
                    <NotificationFab mode="header" />
                  </View>
                </View>

                <Text style={[styles.date, { color: palette.text.secondary }]}>{dateLabel}</Text>
                <Text style={[styles.greeting, { color: palette.text.primary }]}>Good morning, {displayName}</Text>
                <Text style={[styles.subtitle, { color: palette.text.secondary }]}>Daily care summary and smart priorities</Text>
              </View>
            </ImageBackground>
          </AnimatedInView>

          <AnimatedInView delay={40}>
            <WeatherWidget />
          </AnimatedInView>

          <AnimatedInView delay={90}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Task Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={[styles.link, { color: palette.primary.solid }]}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.segmentRow}>
              {segmentOptions.map((item) => (
                <PillFilterChip
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={segment === item.id}
                  onPress={() => setSegment(item.id)}
                />
              ))}
            </View>

            <ElevatedCard style={[styles.progressCard, { backgroundColor: palette.surface.light }]}>
              <View style={styles.progressRingsRow}>
                <ProgressRing progress={dashboardMetrics.healthyRate} label="Healthy" tint={palette.status.success} />
                <ProgressRing progress={dashboardMetrics.readyRate} label="Ready" tint={palette.primary.solid} />
                <ProgressRing progress={dashboardMetrics.riskRate} label="Risk" tint={palette.status.warning} />
              </View>
              <View style={styles.progressFooter}>
                <Text style={[styles.progressMeta, { color: palette.text.secondary }]}>Overdue tasks {dashboardMetrics.overdueTasks}</Text>
                <Text style={[styles.progressMeta, { color: palette.text.secondary }]}>Completed today {dashboardMetrics.completedToday}</Text>
              </View>
            </ElevatedCard>
          </AnimatedInView>

          <AnimatedInView delay={140}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Smart Task Queue</Text>
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <ElevatedCard key={task.id} onPress={() => navigation.navigate('Scan')} style={styles.taskCard}>
                  <View style={styles.taskTopRow}>
                    <Text style={[styles.taskTitle, { color: palette.text.primary }]}>{task.title}</Text>
                    <StatusBadge status={task.status} />
                  </View>
                  <Text style={[styles.taskSubtitle, { color: palette.text.secondary }]}>{task.subtitle}</Text>
                </ElevatedCard>
              ))}
            </View>
          </AnimatedInView>

          <AnimatedInView delay={220}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Recent Scans</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={[styles.link, { color: palette.primary.solid }]}>Open Library</Text>
              </TouchableOpacity>
            </View>

            {recentScans.length === 0 ? (
              <ElevatedCard style={styles.emptyCard}>
                <EmptyState
                  icon="leaf-outline"
                  title="No scans yet"
                  subtitle="Start your first scan to build the plant library and reminders."
                  actionLabel="Start Scan"
                  onAction={() => navigation.navigate('Scan')}
                />
              </ElevatedCard>
            ) : (
              recentScans.map((scan) => (
                <ElevatedCard key={scan.id} onPress={() => navigation.navigate('History')} style={styles.recentItem}>
                  <View style={styles.recentRow}>
                    <View>
                      <Text style={[styles.recentTitle, { color: palette.text.primary }]}>{scan.plantName}</Text>
                      <Text style={[styles.recentSub, { color: palette.text.secondary }]}>{scan.date}</Text>
                    </View>
                    <StatusBadge status={scan.status} />
                  </View>
                </ElevatedCard>
              ))
            )}
          </AnimatedInView>

          <AnimatedInView delay={260}>
            <ElevatedCard style={styles.tipCard}>
              <View style={styles.tipRow}>
                <View style={[styles.tipIcon, { backgroundColor: `${palette.accent.action}22` }]}>
                  <Ionicons name="bulb-outline" size={18} color={palette.accent.action} />
                </View>
                <View style={styles.tipContent}>
                  <Text style={[styles.tipTitle, { color: palette.text.primary }]}>Predictive Reminder</Text>
                  <Text style={[styles.tipText, { color: palette.text.secondary }]}>{dailyTip}</Text>
                </View>
              </View>
            </ElevatedCard>
          </AnimatedInView>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.fabWrap}>
          <FloatingActionButton onPress={() => navigation.navigate('Scan')} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  date: {
    ...typography.caption,
  },
  heroCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    minHeight: 178,
  },
  heroImage: {
    opacity: 0.3,
  },
  heroOverlay: {
    padding: spacing.md,
    minHeight: 178,
    justifyContent: 'flex-end',
  },
  heroTopRow: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 3,
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...typography.headline,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
  },
  link: {
    ...typography.caption,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  progressCard: {
    padding: spacing.md,
    borderRadius: radius.card,
  },
  progressRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  progressFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMeta: {
    ...typography.caption,
  },
  taskList: {
    gap: spacing.xs,
  },
  taskCard: {
    padding: spacing.md,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  taskTitle: {
    ...typography.bodyBold,
    flex: 1,
  },
  taskSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.md,
  },
  recentItem: {
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recentTitle: {
    ...typography.bodyBold,
    maxWidth: 220,
  },
  recentSub: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  tipCard: {
    padding: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodyBold,
  },
  tipText: {
    ...typography.body,
    marginTop: spacing.xxs,
    lineHeight: 20,
  },
  fabWrap: {
    position: 'absolute',
    right: spacing.screenPadding,
    bottom: spacing.lg,
  },
});
