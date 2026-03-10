import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Badge,
  Chip,
  Divider,
  EnhancedButton,
  Snackbar,
  TabBar,
} from '../components/common';
import PlantPreviewTile from '../components/ui/PlantPreviewTile';
import ElevatedCard from '../components/ui/ElevatedCard';
import useAppTheme from '../theme/useAppTheme';
import { radius, spacing, typography } from '../theme';
import { useAppData } from '../contexts/AppDataContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const filters = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'healthy', label: 'Healthy', icon: 'checkmark-circle-outline' },
  { id: 'ready', label: 'Ready', icon: 'leaf-outline' },
  { id: 'harvested', label: 'Harvested', icon: 'checkmark-done-outline' },
  { id: 'watchlist', label: 'Watchlist', icon: 'warning-outline' },
];

const urgencyOf = (status, palette) => {
  if (status === 'harvested') return { label: 'Harvested', color: palette.status.info };
  if (status && status !== 'healthy' && status !== 'ready' && status !== 'root_rot') {
    return { label: 'Watchlist', color: palette.status.warning };
  }
  if (status === 'root_rot') return { label: 'Urgent', color: palette.status.danger };
  if (status === 'ready') return { label: 'Harvest Soon', color: palette.status.success };
  return { label: 'Routine Care', color: palette.status.info };
};

const toTitle = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function HistoryScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const {
    scans,
    refreshScans,
    deleteScan,
    markPlantHarvested,
    loadScanProgress,
    progressMap,
  } = useAppData();
  const { showSnackbar } = useSnackbar();
  const [filter, setFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    conditions: true,
    actions: true,
  });

  const data = useMemo(() => {
    const isDiseaseStatus = (status) => Boolean(status && status !== 'healthy' && status !== 'ready' && status !== 'harvested');
    const filtered = filter === 'all'
      ? scans
      : filter === 'watchlist'
        ? scans.filter((scan) => isDiseaseStatus(scan.status))
        : scans.filter((scan) => scan.status === filter);
    return filtered.map((scan) => {
      const urgency = urgencyOf(scan.status, palette);
      const scanKey = String(scan.mongoId || scan.id || '');
      return {
        ...scan,
        urgency: urgency.label,
        urgencyColor: urgency.color,
        taskProgress: scanKey ? progressMap[scanKey] : null,
      };
    });
  }, [scans, filter, palette, progressMap]);

  useEffect(() => {
    if (!data.length) return;
    const pendingIds = data
      .map((item) => String(item.mongoId || item.id || ''))
      .filter((id) => id && progressMap[id] === undefined);
    if (!pendingIds.length) return;
    loadScanProgress(pendingIds).catch(() => {});
  }, [data, loadScanProgress, progressMap]);

  useEffect(() => {
    if (!isFocused) return;
    refreshScans().catch(() => {});
  }, [isFocused, refreshScans]);

  const openDiseaseNursery = () => {
    if (!selectedScan) return;
    const scanId = selectedScan.mongoId || selectedScan.id;
    if (!scanId) {
      showSnackbar({ type: 'warning', message: 'Missing scan id for disease nursery.' });
      return;
    }
    const nextPlantName = selectedScan.plantName || 'Aloe Vera Plant';
    setSelectedScan(null);
    navigation.navigate('DiseaseNursery', {
      scanId,
      plantName: nextPlantName,
    });
  };

  const openHarvestGuide = () => {
    if (!selectedScan) return;
    navigation.navigate('HarvestGuide');
  };

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshScans();
      setShowRefreshToast(true);
    } finally {
      setRefreshing(false);
    }
  };

  const renderActionButton = ({ label, icon, tone, onPress, helper }) => {
    const isDanger = tone === 'danger';
    const background = isDanger ? 'rgba(220,38,38,0.12)' : palette.surface.soft;
    const border = isDanger ? 'rgba(220,38,38,0.32)' : palette.surface.borderStrong;
    const textColor = isDanger ? palette.status.danger : palette.text.primary;
    const iconColor = isDanger ? palette.status.danger : palette.primary.solid;

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.actionButton, { backgroundColor: background, borderColor: border }]}
      >
        <View style={styles.actionIcon}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionLabel, { color: textColor }]}>{label}</Text>
          {helper ? <Text style={[styles.actionHelper, { color: palette.text.secondary }]}>{helper}</Text> : null}
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color={palette.text.tertiary} />
      </TouchableOpacity>
    );
  };

  const handleDeleteSelectedScan = () => {
    if (!selectedScan) return;
    Alert.alert('Delete Scan', 'Are you sure you want to delete this scan history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const scanId = selectedScan.mongoId || selectedScan.id;
            await deleteScan(scanId);
            setSelectedScan(null);
            setShowDeleteToast(true);
          } catch (error) {
            showSnackbar({ type: 'error', message: error.message || 'Unable to delete this scan.' });
          }
        },
      },
    ]);
  };

  const handleMarkHarvested = () => {
    if (!selectedScan?.plantMongoId) {
      showSnackbar({ type: 'warning', message: 'This scan has no linked plant record.' });
      return;
    }

    Alert.alert('Mark as Harvested', 'Move this plant from Ready to Harvested?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await markPlantHarvested({
              plantMongoId: selectedScan.plantMongoId,
              scanId: selectedScan.mongoId || selectedScan.id,
            });
            setSelectedScan((prev) => (prev ? { ...prev, status: 'harvested', urgency: 'Harvested' } : prev));
            showSnackbar({ type: 'success', message: 'Plant marked as harvested.' });
          } catch (error) {
            showSnackbar({ type: 'error', message: error.message || 'Unable to mark plant as harvested.' });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: palette.surface.light,
              borderColor: palette.surface.border,
              paddingTop: Math.max(spacing.lg, insets.top + spacing.sm),
            },
          ]}
        >
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: palette.text.primary }]}>Plant Library</Text>
            <Text style={[styles.headerSubtitle, { color: palette.text.secondary }]}>
              Browse plants by health status and urgency
            </Text>
            <Text style={[styles.headerMeta, { color: palette.text.tertiary }]}>
              {data.length} scan records available
            </Text>
          </View>
        </View>

        <TabBar
          tabs={filters}
          activeTab={filter}
          onTabChange={setFilter}
          variant="filled"
          style={styles.filterTabs}
        />

        <ElevatedCard style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: palette.text.secondary }]}>Daily Care Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: palette.text.primary }]}>{data.length} plants in this view</Text>
            <Badge label={toTitle(filter)} type="info" size="small" variant="outline" />
          </View>
        </ElevatedCard>

        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          ListFooterComponent={<View style={styles.listFooter} />}
          ListEmptyComponent={
            <ElevatedCard style={styles.emptyCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${palette.primary.solid}14` }]}>
                <Ionicons name="leaf-outline" size={24} color={palette.primary.solid} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>Your plant library is empty</Text>
              <Text style={[styles.emptySub, { color: palette.text.secondary }]}>
                Start with a fresh scan to build organized plant records and care status insights.
              </Text>
              <EnhancedButton
                label="Start Scan"
                icon="scan-outline"
                onPress={() => navigation.navigate('Scan')}
                style={styles.emptyAction}
              />
            </ElevatedCard>
          }
          renderItem={({ item }) => <PlantPreviewTile item={item} onPress={() => setSelectedScan(item)} />}
        />
      </View>

      <Modal
        visible={Boolean(selectedScan)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedScan(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
            <View style={styles.drawerHandle} />
            <View style={[styles.modalStickyHeader, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text.primary }]}>Scan Details</Text>
              <TouchableOpacity onPress={() => setSelectedScan(null)}>
                <Ionicons name="close" size={20} color={palette.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContentScroll}
              stickyHeaderIndices={[]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.modalCard, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
                <LinearGradient
                  colors={['rgba(10,96,62,0.12)', 'rgba(10,96,62,0.02)']}
                  style={styles.modalAccent}
                />
                {selectedScan?.image ? (
                  <View style={styles.modalImageWrap}>
                    <Image source={{ uri: selectedScan.image }} style={styles.modalImage} resizeMode="cover" />
                    <View style={styles.modalImageOverlay} />
                    <View style={styles.modalImageMeta}>
                    <View style={[styles.metaPill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                      <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.metaPillText} numberOfLines={1}>Scan Snapshot</Text>
                    </View>
                    <View style={[styles.metaPill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                      <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.metaPillText} numberOfLines={1}>{selectedScan?.date || '-'}</Text>
                    </View>
                    </View>
                  </View>
                ) : null}

                <ElevatedCard style={styles.detailBlock}>
                  <Text style={[styles.detailName, { color: palette.text.primary }]}>{selectedScan?.plantName || 'Aloe Vera Plant'}</Text>
                  <Text style={[styles.detailMeta, { color: palette.text.secondary }]}>
                    {selectedScan?.date || '-'}{selectedScan?.time ? ` - ${selectedScan.time}` : ''}
                  </Text>
                  {selectedScan?.plantLabel ? (
                    <Text style={[styles.detailMeta, { color: palette.text.tertiary }]}>
                      {selectedScan.plantLabel}
                    </Text>
                  ) : null}
                  <View style={styles.badgeRow}>
                    <Badge
                      label={
                        selectedScan?.status === 'ready'
                          ? 'Harvest Ready'
                          : selectedScan?.status === 'harvested'
                            ? 'Harvested'
                            : toTitle(selectedScan?.status || 'healthy')
                      }
                      type={
                        selectedScan?.status === 'healthy'
                          ? 'success'
                          : selectedScan?.status === 'ready' || selectedScan?.status === 'harvested'
                            ? 'info'
                            : selectedScan?.status === 'root_rot'
                              ? 'error'
                              : 'warning'
                      }
                      variant="outline"
                      size="small"
                    />
                    <Badge
                      label={selectedScan?.urgency || 'Routine Care'}
                      type={
                        selectedScan?.status === 'root_rot'
                          ? 'error'
                          : selectedScan?.status &&
                              selectedScan?.status !== 'healthy' &&
                              selectedScan?.status !== 'ready' &&
                              selectedScan?.status !== 'harvested'
                            ? 'warning'
                            : 'info'
                      }
                      variant="outline"
                      size="small"
                    />
                  </View>
                </ElevatedCard>

                <Divider margin={spacing.sm} />

                <ElevatedCard style={styles.detailBlock}>
                  <View style={styles.sectionHead}>
                    <Text style={[styles.sectionHeadTitle, { color: palette.text.primary }]}>Key Metrics</Text>
                    <Ionicons name="stats-chart-outline" size={18} color={palette.text.secondary} />
                  </View>
                  <View style={styles.metricRow}>
                    <View style={[styles.metricCard, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}>
                      <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Confidence</Text>
                      <Text style={[styles.metricValue, { color: palette.primary.solid }]}>
                        {typeof selectedScan?.confidenceLevel === 'number' ? `${selectedScan.confidenceLevel}%` : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.metricCard, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}>
                      <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Maturity</Text>
                      <Text style={[styles.metricValue, { color: palette.text.primary }]}>{selectedScan?.maturity || 'N/A'}</Text>
                    </View>
                    <View style={[styles.metricCard, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}>
                      <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Urgency</Text>
                      <Text style={[styles.metricValue, { color: palette.text.primary }]}>{selectedScan?.urgency || 'Routine Care'}</Text>
                    </View>
                  </View>
                </ElevatedCard>

                <Divider margin={spacing.sm} />

                <ElevatedCard style={styles.detailBlock}>
                  <TouchableOpacity style={styles.sectionHead} onPress={() => toggleSection('overview')}>
                    <Text style={[styles.sectionHeadTitle, { color: palette.text.primary }]}>Scan Overview</Text>
                    <Ionicons
                      name={expandedSections.overview ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={palette.text.secondary}
                    />
                  </TouchableOpacity>
                  {expandedSections.overview ? (
                    <>
                      <View style={styles.kvGrid}>
                        <View style={[styles.kvCell, { borderColor: palette.surface.border }]}>
                          <Text style={[styles.kvKey, { color: palette.text.secondary }]}>Confidence</Text>
                          <Text style={[styles.kvValue, { color: palette.primary.solid }]}>
                            {typeof selectedScan?.confidenceLevel === 'number' ? `${selectedScan.confidenceLevel}%` : 'N/A'}
                          </Text>
                        </View>
                        <View style={[styles.kvCell, { borderColor: palette.surface.border }]}>
                          <Text style={[styles.kvKey, { color: palette.text.secondary }]}>Maturity</Text>
                          <Text style={[styles.kvValue, { color: palette.text.primary }]}>{selectedScan?.maturity || 'N/A'}</Text>
                        </View>
                        <View style={[styles.kvCell, { borderColor: palette.surface.border }]}>
                          <Text style={[styles.kvKey, { color: palette.text.secondary }]}>Status</Text>
                          <Text style={[styles.kvValue, { color: palette.text.primary }]}>{toTitle(selectedScan?.status || 'healthy')}</Text>
                        </View>
                        <View style={[styles.kvCell, { borderColor: palette.surface.border }]}>
                          <Text style={[styles.kvKey, { color: palette.text.secondary }]}>Urgency</Text>
                          <Text style={[styles.kvValue, { color: palette.text.primary }]}>{selectedScan?.urgency || 'Routine Care'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Detected Summary</Text>
                      <Text style={[styles.detailValue, { color: palette.text.primary }]}>
                        {selectedScan?.detectedSummary || 'No summary available'}
                      </Text>
                    </>
                  ) : null}
                </ElevatedCard>

                <Divider margin={spacing.sm} />

                <ElevatedCard style={styles.detailBlock}>
                  <TouchableOpacity style={styles.sectionHead} onPress={() => toggleSection('conditions')}>
                    <Text style={[styles.sectionHeadTitle, { color: palette.text.primary }]}>Conditions</Text>
                    <Ionicons
                      name={expandedSections.conditions ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={palette.text.secondary}
                    />
                  </TouchableOpacity>
                  {expandedSections.conditions ? (
                    (selectedScan?.diseases || []).length > 0 ? (
                      <View style={styles.chipWrap}>
                        {selectedScan.diseases.map((disease, idx) => (
                          <Chip
                            key={`${disease}-${idx}`}
                            label={disease}
                            color="warning"
                            size="small"
                            selected
                            onPress={() => {}}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.detailValue, { color: palette.text.secondary }]}>No disease detected.</Text>
                    )
                  ) : null}
                </ElevatedCard>

                <Divider margin={spacing.sm} />

                <ElevatedCard style={styles.detailBlock}>
                  <TouchableOpacity style={styles.sectionHead} onPress={() => toggleSection('actions')}>
                    <Text style={[styles.sectionHeadTitle, { color: palette.text.primary }]}>Post-Scan Actions</Text>
                    <Ionicons
                      name={expandedSections.actions ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={palette.text.secondary}
                    />
                  </TouchableOpacity>
                  {expandedSections.actions ? (
                    <>
                      {selectedScan?.status !== 'harvested' && selectedScan?.status !== 'ready' ? (
                        <>
                          <Text style={[styles.detailValue, { color: palette.text.secondary }]}>
                            Continue disease care in the dedicated Disease Nursery page.
                          </Text>
                          <View style={styles.actionGrid}>
                            {renderActionButton({
                              label: 'Open Disease Nursery',
                              icon: 'leaf-outline',
                              tone: 'primary',
                              onPress: openDiseaseNursery,
                              helper: 'View care plan and treatment steps',
                            })}
                          </View>
                        </>
                      ) : null}
                      {selectedScan?.status === 'ready' ? (
                        <>
                          <View style={styles.actionGrid}>
                            {renderActionButton({
                              label: 'Open Harvest Guide',
                              icon: 'leaf-outline',
                              tone: 'primary',
                              onPress: openHarvestGuide,
                              helper: 'Best practices for harvesting aloe',
                            })}
                            {renderActionButton({
                              label: 'Mark as Harvested',
                              icon: 'checkmark-done-outline',
                              tone: 'primary',
                              onPress: handleMarkHarvested,
                              helper: 'Move this scan into harvested status',
                            })}
                          </View>
                        </>
                      ) : null}
                      <View style={styles.actionGrid}>
                        {renderActionButton({
                          label: 'Delete Scan History',
                          icon: 'trash-outline',
                          tone: 'danger',
                          onPress: handleDeleteSelectedScan,
                          helper: 'Remove this scan from your history',
                        })}
                      </View>
                    </>
                  ) : null}
                </ElevatedCard>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Snackbar
        message="Plant library refreshed"
        type="success"
        visible={showRefreshToast}
        onDismiss={() => setShowRefreshToast(false)}
      />
      <Snackbar
        message="Scan history deleted"
        type="warning"
        visible={showDeleteToast}
        onDismiss={() => setShowDeleteToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 0,
  },
  header: {
    marginHorizontal: -spacing.screenPadding,
    minHeight: 170,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  headerTextWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    ...typography.headline,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...typography.body,
    marginTop: spacing.xxs,
  },
  headerMeta: {
    ...typography.caption,
    marginTop: spacing.xxs,
    fontWeight: '700',
  },
  filterTabs: {
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
  },
  summaryValue: {
    ...typography.bodyBold,
    marginTop: spacing.xxs,
  },
  summaryRow: {
    marginTop: spacing.xxs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  listFooter: {
    height: spacing.xl,
  },
  emptyCard: {
    padding: spacing.lg,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radius.floating,
    borderTopRightRadius: radius.floating,
    borderWidth: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: spacing.sm,
  },
  modalContentScroll: {
    paddingBottom: spacing.lg,
  },
  modalStickyHeader: {
    minHeight: 48,
    borderWidth: 0,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 90,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    ...typography.bodyBold,
  },
  modalImageWrap: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  modalImageMeta: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    maxWidth: '48%',
  },
  metaPillText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detailName: {
    ...typography.title,
    marginTop: spacing.xxs,
  },
  detailMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
  },
  metricLabel: {
    ...typography.caption,
  },
  metricValue: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  detailLabel: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    marginTop: 2,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detailBlock: {
    padding: spacing.md,
  },
  sectionHead: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadTitle: {
    ...typography.bodyBold,
  },
  kvGrid: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  kvCell: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.xs,
  },
  kvKey: {
    ...typography.caption,
  },
  kvValue: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  actionGrid: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  actionButton: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    ...typography.bodyBold,
  },
  actionHelper: {
    ...typography.caption,
    marginTop: 2,
  },
});
