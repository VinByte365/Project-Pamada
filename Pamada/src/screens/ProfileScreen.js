import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import AnimatedInView from '../components/common/AnimatedInView';
import ElevatedCard from '../components/ui/ElevatedCard';
import StatusBadge from '../components/ui/StatusBadge';
import useAppTheme from '../theme/useAppTheme';
import { radius, spacing, typography } from '../theme';
import { buildProfileMetrics, getDiseaseDistribution } from '../utils/analyticsHelpers';
import { buildProfileSummaryFields, PROFILE_SETTINGS_FIELDS } from '../utils/profileFields';

const DEFAULT_PROFILE_COVER = require('../../assets/aloe-vera.png');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { user, logout } = useAuth();
  const { analytics, scans, refreshAll } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 400;

  const joinedSource = user?.createdAt || user?.created_at || user?.created_at_utc;
  const joinedDate = joinedSource
    ? new Date(joinedSource).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not available';

  const farmInfo = {
    name: user?.full_name || 'Pamada Farm',
    location: user?.preferences?.location || 'Location not set',
    size: user?.preferences?.farm_size || 'Not specified',
    plants: scans.length || 0,
    joined: joinedDate,
  };
  const profileImageUrl = user?.profile_image?.url || '';
  const coverImageUrl = user?.cover_image?.url || user?.cover_image_url || '';
  const coverImageSource = coverImageUrl ? { uri: coverImageUrl } : DEFAULT_PROFILE_COVER;
  const initials = useMemo(() => {
    const name = (farmInfo.name || '').trim();
    if (!name) return 'P';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase() || 'P';
  }, [farmInfo.name]);

  const settings = PROFILE_SETTINGS_FIELDS;
  const summaryFields = buildProfileSummaryFields(farmInfo, analytics);
  const metrics = buildProfileMetrics(analytics, palette);
  const diseases = getDiseaseDistribution(analytics, [
    { name: 'No active disease signals', percentage: 0, color: palette.status.success },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AnimatedInView>
          <View style={[styles.heroWrap, { borderColor: palette.surface.border, backgroundColor: palette.surface.light }]}>
            <Image source={coverImageSource} style={styles.heroCoverImage} resizeMode="cover" />
            <View style={[styles.coverDivider, { backgroundColor: palette.surface.border }]} />
            <View style={styles.hero}>
              <View style={[styles.avatarFrame, { borderColor: palette.surface.light }]}>
                <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')} style={styles.avatar}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.heroName, { color: palette.text.primary }]}>{farmInfo.name}</Text>
              <Text style={[styles.heroSub, { color: palette.text.secondary }]}>{farmInfo.location}</Text>

              <View style={styles.heroBadges}>
                <StatusBadge status="healthy" label={`${farmInfo.plants} Plants`} />
                <StatusBadge status="ready" label={`Joined ${farmInfo.joined}`} />
              </View>

              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}
                  onPress={() => navigation.navigate('AccountSettings')}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Ionicons name="create-outline" size={16} color={palette.text.primary} />
                  <Text style={[styles.quickActionText, { color: palette.text.primary }]}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickActionBtn, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}
                  onPress={() => navigation.navigate('AboutPamada')}
                  accessibilityRole="button"
                  accessibilityLabel="About Pamada"
                >
                  <Ionicons name="information-circle-outline" size={16} color={palette.text.primary} />
                  <Text style={[styles.quickActionText, { color: palette.text.primary }]}>About</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')}>
                <Text style={[styles.editPhotoText, { color: palette.text.tertiary }]}>Edit photo and cover in Account Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedInView>

        <AnimatedInView delay={70}>
          <ElevatedCard style={styles.summaryCard}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Farm Overview</Text>
            <View style={styles.summaryRows}>
              {summaryFields.map((field) => (
                <SummaryRow
                  key={field.label}
                  icon={field.icon}
                  label={field.label}
                  value={field.value}
                  accent={field.accent}
                />
              ))}
            </View>
          </ElevatedCard>
        </AnimatedInView>

        <AnimatedInView delay={140}>
          <ElevatedCard style={styles.analyticsCard}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Your Analytics</Text>
            <View style={styles.metricsGrid}>
              {metrics.map((metric) => (
                <View
                  key={metric.key}
                  style={[
                    styles.metricTile,
                    { width: isWide ? '48.5%' : '100%' },
                    {
                      borderColor: palette.surface.border,
                      backgroundColor: palette.surface.light,
                    },
                  ]}
                >
                  <View style={styles.metricTileHead}>
                    <Ionicons name={metric.icon} size={15} color={metric.tint} />
                    <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>{metric.label}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{Math.round(metric.value)}%</Text>
                  <View style={[styles.metricTrack, { backgroundColor: palette.surface.soft }]}>
                    <View
                      style={[
                        styles.metricFill,
                        {
                          width: `${metric.value}%`,
                          backgroundColor: metric.tint,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
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

        <AnimatedInView delay={180}>
          <ElevatedCard style={styles.settingsCard}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Settings</Text>
            <View style={styles.settingsList}>
              {settings.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingItem, { borderColor: palette.surface.border }]}
                  onPress={() => navigation.navigate(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View style={[styles.settingIcon, { backgroundColor: `${palette.primary.solid}20` }]}>
                    <Ionicons name={item.icon} size={19} color={palette.primary.solid} />
                  </View>
                  <Text style={[styles.settingLabel, { color: palette.text.primary }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </ElevatedCard>
        </AnimatedInView>

        <AnimatedInView delay={220}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: `${palette.status.danger}22`, borderColor: `${palette.status.danger}50` }]}
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={18} color={palette.status.danger} />
            <Text style={[styles.logoutText, { color: palette.status.danger }]}>Log Out</Text>
          </TouchableOpacity>
        </AnimatedInView>

        <Text style={[styles.footerText, { color: palette.text.tertiary }]}>Pamada v1.0 | Nature AI Suite</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value, accent }) {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.summaryRow, { borderColor: palette.surface.border }]}> 
      <View style={styles.summaryLeft}>
        <Ionicons name={icon} size={17} color={palette.text.secondary} />
        <Text style={[styles.summaryLabel, { color: palette.text.secondary }]}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: accent ? palette.status.success : palette.text.primary }]}>{value}</Text>
    </View>
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
  heroWrap: {
    borderWidth: 1,
    borderRadius: radius.floating,
    overflow: 'hidden',
  },
  heroCoverImage: {
    width: '100%',
    height: 94,
  },
  coverDivider: {
    height: 2,
    width: '100%',
  },
  hero: {
    marginTop: -36,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFrame: {
    borderWidth: 3,
    borderRadius: 48,
    padding: 1,
    marginBottom: spacing.xs,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    ...typography.titleLarge,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroName: {
    ...typography.titleLarge,
    textAlign: 'center',
  },
  heroSub: {
    ...typography.caption,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  editPhotoText: {
    ...typography.caption,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  quickActions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    ...typography.caption,
    fontWeight: '700',
  },
  summaryCard: {
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  summaryRows: {
    gap: spacing.xs,
  },
  summaryRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
  },
  summaryValue: {
    ...typography.bodyBold,
  },
  settingsCard: {
    padding: spacing.md,
  },
  analyticsCard: {
    padding: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metricTile: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  metricTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    flex: 1,
  },
  metricValue: {
    ...typography.bodyBold,
    marginTop: spacing.xs,
  },
  metricTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  metricFill: {
    height: '100%',
    borderRadius: 99,
  },
  distributionList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  settingsList: {
    gap: spacing.xs,
  },
  settingItem: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingLabel: {
    ...typography.bodyMedium,
    flex: 1,
  },
  logoutButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  logoutText: {
    ...typography.bodyBold,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
