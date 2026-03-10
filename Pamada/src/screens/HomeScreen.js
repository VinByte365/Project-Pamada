import React, { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
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
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function regionToZoom(region) {
  if (!region || !Number.isFinite(Number(region.longitudeDelta))) return 11;
  const longitudeDelta = Math.max(Number(region.longitudeDelta), 0.01);
  const zoom = Math.round(Math.log2(360 / longitudeDelta));
  return clamp(zoom, 3, 18);
}

function buildLeafletHtml({ markers, center, zoom, markerColor, interactive = true }) {
  const safeMarkers = JSON.stringify(markers || []);
  const safeCenter = JSON.stringify(center || { lat: 16.2, lng: 121.0 });
  const safeZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : 7;
  const dragEnabled = interactive ? 'true' : 'false';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f5f8f4; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: ${interactive ? 'true' : 'false'},
      attributionControl: true,
      dragging: ${dragEnabled},
      scrollWheelZoom: ${dragEnabled},
      doubleClickZoom: ${dragEnabled},
      boxZoom: ${dragEnabled},
      keyboard: ${dragEnabled},
      tap: ${dragEnabled},
      touchZoom: ${dragEnabled}
    });

    const center = ${safeCenter};
    map.setView([Number(center.lat), Number(center.lng)], ${safeZoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = ${safeMarkers};
    const markerStyle = {
      radius: 7,
      fillColor: '${markerColor}',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.95
    };

    const escapeHtml = (value) =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    markers.forEach((farm) => {
      if (!Number.isFinite(Number(farm.lat)) || !Number.isFinite(Number(farm.lng))) return;
      const name = escapeHtml(farm.name || 'Aloe Garden');
      const region = escapeHtml(farm.region || 'Philippines');
      const marker = L.circleMarker([Number(farm.lat), Number(farm.lng)], markerStyle).addTo(map);
      marker.bindPopup('<strong>' + name + '</strong><br/>' + region);
      marker.on('click', () => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'marker_press',
              payload: {
                id: farm.id,
                name: farm.name,
                region: farm.region,
                lat: farm.lat,
                lng: farm.lng,
              },
            })
          );
        }
      });
    });

    if (markers.length > 1) {
      const bounds = L.latLngBounds(
        markers
          .filter((farm) => Number.isFinite(Number(farm.lat)) && Number.isFinite(Number(farm.lng)))
          .map((farm) => [Number(farm.lat), Number(farm.lng)])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      }
    }
  </script>
</body>
</html>`;
}

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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [gettingDirections, setGettingDirections] = useState(false);

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
        apiRequest('/api/v1/settings/philippines-farms', {
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
          displayName: farm?.name || 'Philippine Aloe Garden',
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
      setFarmsError(error.message || 'Failed to load Philippines farm data.');
      setNearbyFarms([]);
    } finally {
      setFarmsLoading(false);
    }
  }, [token]);

  const refreshGardenPins = React.useCallback(async () => {
    try {
      const gardensResponse = await apiRequest('/api/v1/settings/philippines-farms', {
        method: 'GET',
        token,
      });
      const sourceFarms = gardensResponse?.data?.gardens || [];
      setNearbyFarms(
        sourceFarms.map((farm) => ({
          ...farm,
          displayName: farm?.name || 'Philippine Aloe Garden',
          distanceKm: Number.POSITIVE_INFINITY,
        }))
      );
    } catch (error) {
      setFarmsError(error.message || 'Failed to refresh Philippines farm data.');
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

  const leafletMarkers = useMemo(
    () =>
      farmMarkers.map((farm) => ({
        id: farm.id ?? farm._id ?? `${farm?.coordinates?.lat}-${farm?.coordinates?.lng}`,
        lat: Number(farm.coordinates.lat),
        lng: Number(farm.coordinates.lng),
        name: farm.displayName || farm.name,
        region: farm.region || 'Philippines',
      })),
    [farmMarkers]
  );

  const mapCenter = useMemo(() => {
    if (!mapRegion) return null;
    return {
      lat: Number(mapRegion.latitude),
      lng: Number(mapRegion.longitude),
    };
  }, [mapRegion]);

  const leafletZoom = useMemo(() => regionToZoom(mapRegion), [mapRegion]);

  const leafletPreviewHtml = useMemo(() => {
    if (!mapCenter) return '';
    return buildLeafletHtml({
      markers: leafletMarkers,
      center: mapCenter,
      zoom: leafletZoom,
      markerColor: palette.primary.solid,
      interactive: true,
    });
  }, [leafletMarkers, mapCenter, leafletZoom, palette.primary.solid]);

  const leafletModalHtml = useMemo(() => {
    if (!mapCenter) return '';
    return buildLeafletHtml({
      markers: leafletMarkers,
      center: mapCenter,
      zoom: leafletZoom,
      markerColor: palette.primary.solid,
      interactive: true,
    });
  }, [leafletMarkers, mapCenter, leafletZoom, palette.primary.solid]);

  const openFarmDrawer = React.useCallback((farm) => {
    if (!farm) return;
    setSelectedFarm(farm);
    setDrawerVisible(true);
  }, []);

  const closeFarmDrawer = React.useCallback(() => {
    setDrawerVisible(false);
    setSelectedFarm(null);
  }, []);

  const resolveFarmFromMarker = React.useCallback(
    (marker) => {
      if (!marker) return null;
      const markerId = marker.id != null ? String(marker.id) : '';
      if (markerId) {
        const match = nearbyFarms.find(
          (farm) => String(farm?.id ?? farm?._id ?? '') === markerId
        );
        if (match) return match;
      }
      const lat = Number(marker.lat);
      const lng = Number(marker.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const match = nearbyFarms.find((farm) => {
          const farmLat = Number(farm?.coordinates?.lat);
          const farmLng = Number(farm?.coordinates?.lng);
          return (
            Number.isFinite(farmLat) &&
            Number.isFinite(farmLng) &&
            Math.abs(farmLat - lat) < 0.00001 &&
            Math.abs(farmLng - lng) < 0.00001
          );
        });
        if (match) return match;
      }
      return {
        displayName: marker.name || 'Aloe Garden',
        region: marker.region || 'Philippines',
        coordinates: {
          lat: marker.lat,
          lng: marker.lng,
        },
      };
    },
    [nearbyFarms]
  );

  const handleMapMessage = React.useCallback(
    (event) => {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;
      try {
        const message = JSON.parse(raw);
        if (message?.type !== 'marker_press') return;
        const farm = resolveFarmFromMarker(message.payload || {});
        openFarmDrawer(farm);
      } catch (error) {
        // Ignore malformed map messages.
      }
    },
    [openFarmDrawer, resolveFarmFromMarker]
  );

  const resolveFarmCoords = React.useCallback((farm) => {
    if (!farm) return null;
    const lat = Number(farm?.coordinates?.lat ?? farm?.lat);
    const lng = Number(farm?.coordinates?.lng ?? farm?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, []);

  const handleDirections = React.useCallback(async () => {
    const coords = resolveFarmCoords(selectedFarm);
    if (!coords || gettingDirections) return;
    setGettingDirections(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location Needed', 'Enable location permission to get directions from your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const origin = `${position.coords.latitude},${position.coords.longitude}`;
      const destination = `${coords.lat},${coords.lng}`;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Directions Error', error.message || 'Unable to open directions right now.');
    } finally {
      setGettingDirections(false);
    }
  }, [gettingDirections, resolveFarmCoords, selectedFarm]);

  const selectedFarmName = selectedFarm?.displayName || selectedFarm?.name || 'Aloe Garden';
  const selectedFarmRegion = selectedFarm?.region || 'Philippines';
  const selectedFarmCoords = resolveFarmCoords(selectedFarm);

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
              <View style={styles.heroScrim} />
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
                    Monitor health trends, manage risk, and plan harvest timing
                  </Text>
                  <View style={styles.heroMetaRow}>
                    <View style={[styles.heroMetaPill, { backgroundColor: `${palette.surface.light}CC` }]}>
                      <Ionicons name="analytics-outline" size={12} color={palette.primary.solid} />
                      <Text style={[styles.heroMetaText, { color: palette.text.primary }]}>
                        {snapshotInsights.highRiskCount} Priority Cases
                      </Text>
                    </View>
                    <View style={[styles.heroMetaPill, { backgroundColor: `${palette.surface.light}CC` }]}>
                      <Ionicons name="leaf-outline" size={12} color={palette.status.success} />
                      <Text style={[styles.heroMetaText, { color: palette.text.primary }]}>
                        {snapshotInsights.readyCount} Harvest Ready
                      </Text>
                    </View>
                  </View>
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
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Philippine Aloe Farms & Gardens</Text>
              <TouchableOpacity onPress={refreshGardenPins}>
                <Text style={[styles.link, { color: palette.primary.solid }]}>
                  {farmsLoading ? 'Loading...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>

            <ElevatedCard style={[styles.mapCard, { borderColor: palette.surface.border }]}>
              {mapRegion ? (
                <View style={[styles.mapCanvas, { borderColor: palette.surface.border }]}>
                  <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletPreviewHtml }}
                    style={StyleSheet.absoluteFill}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    onMessage={handleMapMessage}
                  />

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
                    {farmsLoading ? 'Loading map...' : 'No Philippines farm coordinates available.'}
                  </Text>
                </View>
              )}

              {farmsError ? (
                <Text style={[styles.mapErrorText, { color: palette.status.warning }]}>{farmsError}</Text>
              ) : nearbyFarms.length === 0 ? (
                <Text style={[styles.mapErrorText, { color: palette.text.secondary }]}>No Philippines farms available right now.</Text>
              ) : (
                <View style={styles.farmList}>
                  {nearbyFarms.slice(0, 3).map((farm) => (
                    <TouchableOpacity
                      key={`nearby-${farm.id}`}
                      style={styles.farmRow}
                      onPress={() => openFarmDrawer(farm)}
                      activeOpacity={0.8}
                    >
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
                    </TouchableOpacity>
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
              <Text style={[styles.mapModalTitle, { color: palette.text.primary }]}>Philippine Aloe Farms & Gardens Map</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={20} color={palette.text.secondary} />
              </TouchableOpacity>
            </View>
            {mapRegion ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: leafletModalHtml }}
                style={styles.mapModalView}
                scrollEnabled={false}
                onMessage={handleMapMessage}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFarmDrawer}
      >
        <Pressable style={styles.drawerBackdrop} onPress={closeFarmDrawer}>
          <Pressable
            style={[
              styles.drawerSheet,
              {
                backgroundColor: palette.surface.light,
                borderColor: palette.surface.border,
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.drawerHandle, { backgroundColor: palette.surface.border }]} />
            <Text style={[styles.drawerTitle, { color: palette.text.primary }]}>Farm Details</Text>
            <View style={styles.drawerDetails}>
              <Text style={[styles.drawerName, { color: palette.text.primary }]} numberOfLines={1}>
                {selectedFarmName}
              </Text>
              <Text style={[styles.drawerMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                {selectedFarmRegion}
              </Text>
              {selectedFarmCoords ? (
                <Text style={[styles.drawerMeta, { color: palette.text.tertiary }]} numberOfLines={1}>
                  {selectedFarmCoords.lat.toFixed(5)}, {selectedFarmCoords.lng.toFixed(5)}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.drawerAction, { backgroundColor: palette.surface.soft }]}
              onPress={handleDirections}
              disabled={gettingDirections || !selectedFarmCoords}
            >
              <Ionicons name="navigate-outline" size={18} color={palette.text.primary} />
              <Text style={[styles.drawerActionText, { color: palette.text.primary }]}>
                {gettingDirections ? 'Opening directions...' : 'Directions from current location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.drawerAction, { backgroundColor: palette.surface.soft }]}
              onPress={closeFarmDrawer}
            >
              <Ionicons name="close-outline" size={18} color={palette.text.secondary} />
              <Text style={[styles.drawerActionText, { color: palette.text.secondary }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 20, 16, 0.34)',
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
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroMetaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heroMetaPill: {
    minHeight: 26,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    ...typography.caption,
    fontWeight: '700',
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
  drawerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawerSheet: {
    borderTopLeftRadius: radius.floating,
    borderTopRightRadius: radius.floating,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  drawerTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  drawerDetails: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  drawerName: {
    ...typography.bodyBold,
  },
  drawerMeta: {
    ...typography.caption,
  },
  drawerAction: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  drawerActionText: {
    ...typography.body,
    fontWeight: '700',
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
