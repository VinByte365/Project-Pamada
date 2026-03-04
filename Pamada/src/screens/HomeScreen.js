import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Callout, Marker } from 'react-native-maps';
import ScreenContainer from '../components/common/ScreenContainer';
import AnimatedInView from '../components/common/AnimatedInView';
import EmptyState from '../components/common/EmptyState';
import { Badge, Chip, Divider } from '../components/common';
import ElevatedCard from '../components/ui/ElevatedCard';
import FloatingActionButton from '../components/ui/FloatingActionButton';
import ProgressRing from '../components/ui/ProgressRing';
import WeatherWidget from '../components/ui/WeatherWidget';
import NotificationFab from '../components/community/NotificationFab';
import useAppTheme from '../theme/useAppTheme';
import { radius, spacing, typography } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { apiRequest } from '../utils/api';

const segmentOptions = [
  { id: 'today', label: 'Today', icon: 'today-outline' },
  { id: 'priority', label: 'Priority', icon: 'flash-outline' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { user, token } = useAuth();
  const { recentScans, stats, dailyTip, refreshAll } = useAppData();
  const [segment, setSegment] = useState('today');
  const [nearbyFarms, setNearbyFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [farmsError, setFarmsError] = useState('');
  const [mapRegionOverride, setMapRegionOverride] = useState(null);
  const [heroGifUrl, setHeroGifUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);

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

  const snapshotInsights = useMemo(() => {
    const risky = recentScans.filter(
      (item) => item.status && item.status !== 'healthy' && item.status !== 'ready' && item.status !== 'harvested'
    );
    const ready = recentScans.filter((item) => item.status === 'ready');
    const latest = recentScans[0];
    return {
      highRiskCount: risky.length,
      readyCount: ready.length,
      latestSummary: latest?.detectedSummary || 'No recent scan insights yet',
      latestLabel: latest?.plantName || 'Scan pending',
    };
  }, [recentScans]);

  const fetchDashboardAssets = React.useCallback(async () => {
    setFarmsLoading(true);
    setFarmsError('');
    try {
      const [gardensResponse, heroResponse] = await Promise.all([
        apiRequest('/api/v1/settings/luzon-gardens', {
          method: 'GET',
          token,
        }),
        apiRequest('/api/v1/settings/home-hero-media', {
          method: 'GET',
          token,
        }),
      ]);

      const sourceFarms = gardensResponse?.data?.gardens || [];
      const region = gardensResponse?.data?.region || null;
      const heroUrl = String(heroResponse?.data?.hero_gif_url || '').trim();

      const farms = sourceFarms.map((farm) => {
        const farmLat = Number(farm?.coordinates?.lat);
        const farmLng = Number(farm?.coordinates?.lng);
        return {
          ...farm,
          distanceKm: Number.POSITIVE_INFINITY,
          displayName: farm?.name || 'Luzon Aloe Garden',
          coordinates: {
            lat: farmLat,
            lng: farmLng,
          },
        };
      });

      setNearbyFarms(farms);
      setMapRegionOverride(region);
      if (heroUrl) {
        setHeroGifUrl(heroUrl);
      }
    } catch (error) {
      setFarmsError(error.message || 'Failed to load Luzon garden data.');
      setNearbyFarms([]);
    } finally {
      setFarmsLoading(false);
    }
  }, [token]);

  const refreshGardenPins = React.useCallback(async () => {
    try {
      const gardensResponse = await apiRequest('/api/v1/settings/luzon-gardens', {
        method: 'GET',
        token,
      });
      const sourceFarms = gardensResponse?.data?.gardens || [];
      setNearbyFarms(
        sourceFarms.map((farm) => ({
          ...farm,
          displayName: farm?.name || 'Luzon Aloe Garden',
          distanceKm: Number.POSITIVE_INFINITY,
        }))
      );
    } catch (error) {
      setFarmsError(error.message || 'Failed to refresh Luzon garden data.');
    }
  }, [token]);

  React.useEffect(() => {
    fetchDashboardAssets();
  }, [fetchDashboardAssets]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshAll(), fetchDashboardAssets()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardAssets, refreshAll]);

  const farmMarkers = useMemo(
    () =>
      nearbyFarms.filter(
        (farm) => Number.isFinite(Number(farm?.coordinates?.lat)) && Number.isFinite(Number(farm?.coordinates?.lng))
      ),
    [nearbyFarms]
  );

  const mapRegion = useMemo(() => {
    if (mapRegionOverride) return mapRegionOverride;
    if (!farmMarkers.length) return null;
    const points = [
      ...farmMarkers.map((farm) => ({
        lat: Number(farm.coordinates.lat),
        lng: Number(farm.coordinates.lng),
      })),
    ];

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max((maxLat - minLat) * 1.6, 0.3);
    const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.3);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [farmMarkers, mapRegionOverride]);

  return (
    <ScreenContainer padding={false} edges={['bottom']}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <AnimatedInView>
            <ImageBackground
              source={heroGifUrl ? { uri: heroGifUrl } : null}
              style={styles.heroCard}
              imageStyle={styles.heroImage}
              blurRadius={3}
            >
              <View style={[styles.heroOverlay, { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) }]}>
                <View style={[styles.heroTopRow, { top: Math.max(spacing.sm, insets.top) }]}>
                  <View style={styles.heroTopActions}>
                    <TouchableOpacity
                      style={[styles.headerIconWrap, { backgroundColor: palette.surface.light }]}
                      onPress={() => navigation.navigate('Messages')}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={19} color={palette.text.primary} />
                    </TouchableOpacity>
                    <NotificationFab mode="header" />
                  </View>
                </View>

                <View style={styles.heroTextBlock}>
                  <Text style={[styles.date, { color: palette.text.secondary }]} numberOfLines={1}>
                    {dateLabel}
                  </Text>
                  <Text style={[styles.greeting, { color: palette.text.primary }]} numberOfLines={2}>
                    Good morning, {displayName}
                  </Text>
                  <Text style={[styles.subtitle, { color: palette.text.secondary }]} numberOfLines={2}>
                    Daily care summary and smart priorities
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </AnimatedInView>

          <View
            style={[
              styles.homeBodySheet,
              {
                backgroundColor: palette.surface.light,
                borderColor: palette.surface.border,
              },
            ]}
          >
            <AnimatedInView delay={40}>
              <WeatherWidget />
            </AnimatedInView>

            <AnimatedInView delay={90}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Daily Health Snapshot</Text>
                <TouchableOpacity onPress={() => navigation.navigate('History')}>
                  <Text style={[styles.link, { color: palette.primary.solid }]}>Open Library</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.segmentRow}>
                {segmentOptions.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    selected={segment === item.id}
                    onPress={() => setSegment(item.id)}
                    color={segment === item.id ? 'primary' : 'success'}
                  />
                ))}
              </View>

              <ElevatedCard style={[styles.progressCard, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
                <View style={styles.progressRingsRow}>
                  <ProgressRing progress={dashboardMetrics.healthyRate} label="Healthy" tint={palette.status.success} />
                  <ProgressRing progress={dashboardMetrics.readyRate} label="Ready" tint={palette.primary.solid} />
                  <ProgressRing progress={dashboardMetrics.riskRate} label="Risk" tint={palette.status.warning} />
                </View>
                <View style={styles.snapshotCards}>
                  <View style={[styles.snapshotCard, { borderColor: palette.surface.border }]}>
                    <Text style={[styles.snapshotLabel, { color: palette.text.secondary }]}>Priority Cases</Text>
                    <Text style={[styles.snapshotValue, { color: palette.status.warning }]}>{snapshotInsights.highRiskCount}</Text>
                    <Text style={[styles.snapshotHint, { color: palette.text.tertiary }]}>Needs immediate review</Text>
                  </View>
                  <View style={[styles.snapshotCard, { borderColor: palette.surface.border }]}>
                    <Text style={[styles.snapshotLabel, { color: palette.text.secondary }]}>Harvest Queue</Text>
                    <Text style={[styles.snapshotValue, { color: palette.status.success }]}>{snapshotInsights.readyCount}</Text>
                    <Text style={[styles.snapshotHint, { color: palette.text.tertiary }]}>Plants ready this cycle</Text>
                  </View>
                </View>
                <View style={[styles.latestCard, { borderColor: palette.surface.border }]}>
                  <Text style={[styles.snapshotLabel, { color: palette.text.secondary }]}>Latest Insight</Text>
                  <Text style={[styles.latestLabel, { color: palette.text.primary }]} numberOfLines={1}>
                    {snapshotInsights.latestLabel}
                  </Text>
                  <Text style={[styles.latestSummary, { color: palette.text.secondary }]} numberOfLines={2}>
                    {snapshotInsights.latestSummary}
                  </Text>
                </View>
                <View style={styles.progressFooter}>
                  <TouchableOpacity onPress={() => navigation.navigate('Scan')}>
                    <Text style={[styles.progressMeta, { color: palette.primary.solid }]}>Run New Scan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('History')}>
                    <Text style={[styles.progressMeta, { color: palette.primary.solid }]}>Review Watchlist</Text>
                  </TouchableOpacity>
                </View>
              </ElevatedCard>
            </AnimatedInView>

            <AnimatedInView delay={140}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Luzon Aloe Gardens</Text>
              <TouchableOpacity onPress={refreshGardenPins}>
                <Text style={[styles.link, { color: palette.primary.solid }]}>
                  {farmsLoading ? 'Loading...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>

            <ElevatedCard style={[styles.mapCard, { borderColor: palette.surface.border }]}>
              {mapRegion ? (
                <View style={[styles.mapCanvas, { borderColor: palette.surface.border }]}>
                  <MapView
                    key={`${mapRegion.latitude}-${mapRegion.longitude}-${mapRegion.latitudeDelta}-${mapRegion.longitudeDelta}`}
                    style={StyleSheet.absoluteFill}
                    initialRegion={mapRegion}
                    showsCompass={false}
                    toolbarEnabled={false}
                    onPress={() => setMapModalVisible(true)}
                  >
                    {farmMarkers.map((farm) => (
                      <Marker
                        key={`farm-marker-${farm.id}`}
                        coordinate={{
                          latitude: Number(farm.coordinates.lat),
                          longitude: Number(farm.coordinates.lng),
                        }}
                        pinColor={palette.primary.solid}
                      >
                        <Callout>
                          <View style={styles.callout}>
                            <Text style={styles.calloutTitle}>{farm.displayName || farm.name}</Text>
                            <Text style={styles.calloutMeta}>{farm.region}</Text>
                            <Text style={styles.calloutMeta}>Luzon, Philippines</Text>
                          </View>
                        </Callout>
                      </Marker>
                    ))}
                  </MapView>

                  <TouchableOpacity
                    style={[styles.expandMapButton, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}
                    onPress={() => setMapModalVisible(true)}
                  >
                    <Ionicons name="expand-outline" size={16} color={palette.text.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.mapPlaceholder, { borderColor: palette.surface.border, backgroundColor: `${palette.primary.solid}0F` }]}>
                  <Text style={[styles.mapPlaceholderText, { color: palette.text.secondary }]}>
                    {farmsLoading ? 'Loading map...' : 'No Luzon garden coordinates available.'}
                  </Text>
                </View>
              )}

              {farmsError ? (
                <Text style={[styles.mapErrorText, { color: palette.status.warning }]}>{farmsError}</Text>
              ) : nearbyFarms.length === 0 ? (
                <Text style={[styles.mapErrorText, { color: palette.text.secondary }]}>No Luzon gardens available right now.</Text>
              ) : (
                <View style={styles.farmList}>
                  {nearbyFarms.slice(0, 3).map((farm) => (
                    <View key={`nearby-${farm.id}`} style={styles.farmRow}>
                      <Ionicons name="location" size={14} color={palette.primary.solid} />
                      <View style={styles.farmInfo}>
                        <Text style={[styles.farmName, { color: palette.text.primary }]} numberOfLines={1}>
                          {farm.displayName || farm.name}
                        </Text>
                        <Text style={[styles.farmMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                          {farm.region}
                        </Text>
                      </View>
                      <Ionicons name="navigate-circle-outline" size={18} color={palette.primary.solid} />
                    </View>
                  ))}
                </View>
              )}
            </ElevatedCard>
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
                    <Badge
                      label={scan.status === 'ready' ? 'Harvest Ready' : String(scan.status || 'unknown').replace(/_/g, ' ')}
                      type={scan.status === 'healthy' ? 'success' : scan.status === 'ready' ? 'info' : scan.status === 'root_rot' ? 'error' : 'warning'}
                      size="small"
                      variant="outline"
                    />
                  </View>
                </ElevatedCard>
              ))
            )}
            </AnimatedInView>

            <Divider margin={spacing.sm} />

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
          </View>
        </ScrollView>

        <View style={styles.fabWrap}>
          <FloatingActionButton onPress={() => navigation.navigate('Scan')} />
        </View>
      </View>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.mapModalBackdrop}>
          <View style={[styles.mapModalCard, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
            <View style={styles.mapModalHeader}>
              <Text style={[styles.mapModalTitle, { color: palette.text.primary }]}>Nearby Garden Shop Map</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={20} color={palette.text.secondary} />
              </TouchableOpacity>
            </View>
            {mapRegion ? (
              <MapView
                style={styles.mapModalView}
                initialRegion={mapRegion}
                showsCompass
                toolbarEnabled={false}
              >
                {farmMarkers.map((farm) => (
                  <Marker
                    key={`full-farm-marker-${farm.id}`}
                    coordinate={{
                      latitude: Number(farm.coordinates.lat),
                      longitude: Number(farm.coordinates.lng),
                    }}
                    pinColor={palette.primary.solid}
                    title={farm.displayName || farm.name}
                    description={farm.region}
                  />
                ))}
              </MapView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  date: {
    ...typography.caption,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroCard: {
    marginTop: 0,
    marginHorizontal: -spacing.screenPadding,
    overflow: 'hidden',
    minHeight: 286,
    borderRadius: 0,
  },
  heroImage: {
    resizeMode: 'cover',
    borderRadius: 0,
    opacity: 0.8,
  },
  heroOverlay: {
    padding: spacing.md,
    minHeight: 248,
    justifyContent: 'flex-end',
  },
  homeBodySheet: {
    marginTop: -26,
    marginHorizontal: -spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  heroTopRow: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 3,
  },
  heroTextBlock: {
    paddingRight: 86,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    ...typography.headline,
    marginTop: spacing.xs,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    fontWeight: '800',
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
    borderWidth: 1,
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
  snapshotCards: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  snapshotCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  snapshotLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
  snapshotValue: {
    ...typography.title,
    marginTop: 2,
  },
  snapshotHint: {
    ...typography.caption,
    marginTop: 2,
  },
  latestCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  latestLabel: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  latestSummary: {
    ...typography.caption,
    marginTop: 2,
    lineHeight: 18,
  },
  progressMeta: {
    ...typography.caption,
  },
  mapCard: {
    padding: spacing.md,
    borderWidth: 1,
  },
  mapCanvas: {
    height: 180,
    borderRadius: radius.card,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  mapPlaceholderText: {
    ...typography.body,
    textAlign: 'center',
  },
  expandMapButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    width: 180,
    paddingVertical: 2,
  },
  calloutTitle: {
    ...typography.bodyBold,
    color: '#1E2A22',
  },
  calloutMeta: {
    ...typography.caption,
    color: '#5D6F63',
    marginTop: 1,
  },
  mapErrorText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  mapModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
  },
  mapModalCard: {
    flex: 1,
    borderRadius: radius.floating,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapModalHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapModalTitle: {
    ...typography.bodyBold,
  },
  mapModalView: {
    flex: 1,
  },
  farmList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  farmRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    ...typography.bodyBold,
  },
  farmMeta: {
    ...typography.caption,
    marginTop: 1,
  },
  farmDistance: {
    ...typography.caption,
    fontWeight: '700',
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
