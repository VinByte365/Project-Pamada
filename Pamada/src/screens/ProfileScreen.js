import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import AnimatedInView from '../components/common/AnimatedInView';
import ElevatedCard from '../components/ui/ElevatedCard';
import ProgressRing from '../components/ui/ProgressRing';
import StatusBadge from '../components/ui/StatusBadge';
import useAppTheme from '../theme/useAppTheme';
import { radius, spacing, typography } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { user, logout } = useAuth();
  const { analytics, scans } = useAppData();

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
  const initials = useMemo(() => {
    const name = (farmInfo.name || '').trim();
    if (!name) return 'P';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase() || 'P';
  }, [farmInfo.name]);

  const settings = [
    { icon: 'person-circle-outline', label: 'Account Settings', route: 'AccountSettings' },
    { icon: 'notifications-outline', label: 'Notifications', route: 'NotificationsSettings' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', route: 'PrivacySecurity' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: 'HelpSupport' },
    { icon: 'information-circle-outline', label: 'About Pamada', route: 'AboutPamada' },
  ];

  const metrics = [
    {
      key: 'harvest',
      label: 'Harvest Rate',
      value: Number(String(analytics.harvestRate || '0').replace('%', '')),
      icon: 'leaf-outline',
      tint: palette.accent.action,
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

  const diseases = analytics.diseaseDistribution?.length
    ? analytics.diseaseDistribution
    : [{ name: 'No active disease signals', percentage: 0, color: palette.status.success }];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AnimatedInView>
          <LinearGradient
            colors={[palette.primary.start, palette.primary.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')} style={styles.avatar}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.heroName}>{farmInfo.name}</Text>
            <Text style={styles.heroSub}>{farmInfo.location}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')}>
              <Text style={styles.editPhotoText}>Edit photo in Account Settings</Text>
            </TouchableOpacity>
            <View style={styles.heroBadges}>
              <StatusBadge status="healthy" label={`${farmInfo.plants} Plants`} />
              <StatusBadge status="ready" label={`Joined ${farmInfo.joined}`} />
            </View>
          </LinearGradient>
        </AnimatedInView>

        <AnimatedInView delay={70}>
          <ElevatedCard style={styles.summaryCard}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Farm Overview</Text>
            <View style={styles.summaryRows}>
              <SummaryRow icon="resize-outline" label="Farm Size" value={farmInfo.size} />
              <SummaryRow icon="leaf-outline" label="Total Plants" value={`${farmInfo.plants}`} />
              <SummaryRow icon="calendar-outline" label="Member Since" value={farmInfo.joined} />
              <SummaryRow icon="analytics-outline" label="AI Accuracy" value={analytics.avgMaturity || '0%'} accent />
            </View>
          </ElevatedCard>
        </AnimatedInView>

        <AnimatedInView delay={140}>
          <ElevatedCard style={styles.analyticsCard}>
            <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Your Analytics</Text>
            <View style={styles.ringsRow}>
              {metrics.map((metric) => (
                <View key={metric.key} style={styles.ringItem}>
                  <ProgressRing progress={metric.value} tint={metric.tint} label={metric.label} />
                  <View style={styles.metricIconWrap}>
                    <Ionicons name={metric.icon} size={14} color={metric.tint} />
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
  hero: {
    borderRadius: radius.floating,
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
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
    color: '#FFFFFF',
  },
  heroSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xxs,
  },
  editPhotoText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.95)',
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
