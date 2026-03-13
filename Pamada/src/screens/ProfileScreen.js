import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
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
  const hasAnalytics = Number(analytics?.totalPlants || 0) > 0;

  const buildChartBars = useCallback((value = 0) => {
    const normalized = Math.min(Math.max(Number(value) || 0, 0), 100);
    const base = 6;
    const max = 34;
    const multipliers = [0.3, 0.45, 0.6, 0.8, 1];
    return multipliers.map((multiplier, index) => ({
      key: `${index}-${normalized}`,
      height: Math.round(base + (max - base) * Math.min(1, (normalized / 100) * multiplier)),
    }));
  }, []);

  const parsePercent = (value) => {
    if (typeof value === 'number') return value;
    const normalized = String(value || '').replace('%', '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const buildInsight = (label, value, isEmpty, isInverse = false) => {
    if (isEmpty) {
      return {
        summary: `No ${label.toLowerCase()} data recorded yet.`,
        interpretation: 'Start scanning plants to generate this analytics section.',
      };
    }

    const normalized = Math.min(Math.max(value, 0), 100);
    const good = isInverse ? normalized <= 30 : normalized >= 70;
    const moderate = isInverse ? normalized <= 55 : normalized >= 45;
    const trend = good ? 'strong' : moderate ? 'mixed' : 'low';
    const interpretation = good
      ? 'Keep the current routine. Results are trending positively.'
      : moderate
      ? 'There is progress, but there is still room to improve consistency.'
      : 'Focus on improving care routines and rescan with better lighting.';

    return {
      summary: `${label} is ${normalized.toFixed(0)}%, indicating a ${trend} signal.`,
      interpretation,
    };
  };

  const handleExportAnalytics = useCallback(async () => {
    try {
      const logoAsset = Asset.fromModule(DEFAULT_PROFILE_COVER);
      if (!logoAsset.localUri) {
        await logoAsset.downloadAsync();
      }
      const logoUri = logoAsset.localUri || logoAsset.uri;
      const logoBase64 = logoUri
        ? await LegacyFileSystem.readAsStringAsync(logoUri, {
            encoding: LegacyFileSystem.EncodingType?.Base64 || 'base64',
          })
        : '';
      const logoData = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';

      const harvestRate = parsePercent(analytics?.harvestRate);
      const diseaseRate = parsePercent(analytics?.diseaseRate);
      const avgMaturity = parsePercent(analytics?.avgMaturity);

      const sections = [
        {
          key: 'harvest',
          label: 'Harvest Rate',
          value: harvestRate,
          empty: harvestRate <= 0,
          accent: '#22C55E',
          inverse: false,
        },
        {
          key: 'disease',
          label: 'Disease Rate',
          value: diseaseRate,
          empty: diseaseRate <= 0,
          accent: '#F97316',
          inverse: true,
        },
        {
          key: 'maturity',
          label: 'Average Maturity',
          value: avgMaturity,
          empty: avgMaturity <= 0,
          accent: '#38BDF8',
          inverse: false,
        },
      ].map((section) => ({
        ...section,
        insight: buildInsight(section.label, section.value, section.empty, section.inverse),
      }));

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; font-family: "Helvetica Neue", Arial, sans-serif; }
              body { margin: 0; padding: 32px; color: #1F2933; background: #F7FAF8; }
              .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
              .logo { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
              .app-name { font-size: 24px; font-weight: 700; }
              .sub { font-size: 13px; color: #516157; }
              .card { background: #FFFFFF; border: 1px solid #E1E8E3; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
              .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
              .info-item { font-size: 13px; }
              .info-label { color: #5F6C63; margin-bottom: 4px; }
              .section-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
              .graph-wrap { display: flex; align-items: center; gap: 16px; }
              .graph { width: 140px; height: 140px; border-radius: 12px; border: 1px solid #E1E8E3; display: flex; align-items: center; justify-content: center; background: #F6FAF7; }
              .graph-value { font-size: 24px; font-weight: 700; }
              .bar { width: 100%; height: 10px; background: #E9F0EC; border-radius: 999px; overflow: hidden; margin-top: 12px; }
              .bar-fill { height: 100%; border-radius: 999px; }
              .summary { margin-top: 12px; font-size: 13px; color: #334155; }
              .interpretation { margin-top: 6px; font-size: 12px; color: #5F6C63; }
              .footer { margin-top: 24px; font-size: 11px; color: #7A867E; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoData ? `<img class="logo" src="${logoData}" />` : ''}
              <div>
                <div class="app-name">Pamada Analytics Report</div>
                <div class="sub">Aloe Vera Intelligence Suite</div>
              </div>
            </div>

            <div class="card">
              <div class="section-title">Farm Profile</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">User</div>
                  <div>${escapeHtml(farmInfo.name)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div>${escapeHtml(farmInfo.location)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Farm Size</div>
                  <div>${escapeHtml(farmInfo.size)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Member Since</div>
                  <div>${escapeHtml(farmInfo.joined)}</div>
                </div>
              </div>
            </div>

            ${sections
              .map(
                (section) => `
                  <div class="card">
                    <div class="section-title">${section.label}</div>
                    <div class="graph-wrap">
                      <div class="graph">
                        <div class="graph-value">${section.empty ? '—' : `${section.value.toFixed(0)}%`}</div>
                      </div>
                      <div style="flex: 1;">
                        <div class="bar">
                          <div class="bar-fill" style="width: ${section.empty ? 0 : Math.min(section.value, 100)}%; background: ${section.accent};"></div>
                        </div>
                        <div class="summary">${escapeHtml(section.insight.summary)}</div>
                        <div class="interpretation">${escapeHtml(section.insight.interpretation)}</div>
                      </div>
                    </div>
                  </div>
                `
              )
              .join('')}

            <div class="footer">Generated on ${new Date().toLocaleString()}.</div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Export Complete', 'PDF saved. Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Unable to generate PDF.');
    }
  }, [analytics, farmInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      refreshAll().catch(() => {});
    }, [refreshAll])
  );

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
            <View style={styles.analyticsHeader}>
              <Text style={[styles.cardTitle, { color: palette.text.primary, marginBottom: 0 }]}>Your Analytics</Text>
              <TouchableOpacity
                style={[styles.exportButton, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}
                onPress={handleExportAnalytics}
                accessibilityRole="button"
                accessibilityLabel="Export analytics report"
              >
                <Ionicons name="download-outline" size={16} color={palette.text.primary} />
                <Text style={[styles.exportButtonText, { color: palette.text.primary }]}>Export</Text>
              </TouchableOpacity>
            </View>
            {!hasAnalytics ? (
              <View style={[styles.analyticsEmpty, { borderColor: palette.surface.border }]}>
                <Ionicons name="analytics-outline" size={18} color={palette.text.secondary} />
                <Text style={[styles.analyticsEmptyText, { color: palette.text.secondary }]}>
                  No analytics yet. Run scans to populate plant library stats.
                </Text>
              </View>
            ) : null}
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
                  <View style={styles.chartRow}>
                    {buildChartBars(metric.value).map((bar) => (
                      <View
                        key={bar.key}
                        style={[
                          styles.chartBar,
                          {
                            height: bar.height,
                            backgroundColor: `${metric.tint}CC`,
                          },
                        ]}
                      />
                    ))}
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
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exportButton: {
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  exportButtonText: {
    ...typography.caption,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  analyticsEmpty: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  analyticsEmptyText: {
    ...typography.caption,
    flex: 1,
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
  chartRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 38,
  },
  chartBar: {
    width: 8,
    borderRadius: 6,
    backgroundColor: '#000000',
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
