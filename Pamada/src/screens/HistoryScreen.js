import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { spacing, typography } from '../theme';
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
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { scans, refreshScans, deleteScan, markPlantHarvested } = useAppData();
  const { showSnackbar } = useSnackbar();
  const [filter, setFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);

  const data = useMemo(() => {
    const isDiseaseStatus = (status) => Boolean(status && status !== 'healthy' && status !== 'ready' && status !== 'harvested');
    const filtered = filter === 'all'
      ? scans
      : filter === 'watchlist'
        ? scans.filter((scan) => isDiseaseStatus(scan.status))
        : scans.filter((scan) => scan.status === filter);
    return filtered.map((scan) => {
      const urgency = urgencyOf(scan.status, palette);
      return {
        ...scan,
        urgency: urgency.label,
        urgencyColor: urgency.color,
      };
    });
  }, [scans, filter, palette]);

  const recommendationItems = useMemo(() => {
    if (!selectedScan?.raw) return [];
    const treatment = selectedScan.raw?.recommendations?.treatment_plan || [];
    const preventive = selectedScan.raw?.recommendations?.preventive_measures || [];
    return [...treatment, ...preventive].slice(0, 6);
  }, [selectedScan]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshScans();
      setShowRefreshToast(true);
    } finally {
      setRefreshing(false);
    }
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
            await markPlantHarvested(selectedScan.plantMongoId);
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
        animationType="fade"
        onRequestClose={() => setSelectedScan(null)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modalCard, { backgroundColor: palette.surface.light, borderColor: palette.surface.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: palette.text.primary }]}>Scan Details</Text>
                <TouchableOpacity onPress={() => setSelectedScan(null)}>
                  <Ionicons name="close" size={20} color={palette.text.secondary} />
                </TouchableOpacity>
              </View>

              {selectedScan?.image ? (
                <Image source={{ uri: selectedScan.image }} style={styles.modalImage} resizeMode="cover" />
              ) : null}

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

              <View style={styles.metricRow}>
                <View style={[styles.metricCard, { borderColor: palette.surface.border }]}> 
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Confidence</Text>
                  <Text style={[styles.metricValue, { color: palette.primary.solid }]}> 
                    {typeof selectedScan?.confidenceLevel === 'number' ? `${selectedScan.confidenceLevel}%` : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.metricCard, { borderColor: palette.surface.border }]}> 
                  <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Maturity</Text>
                  <Text style={[styles.metricValue, { color: palette.text.primary }]}>{selectedScan?.maturity || 'N/A'}</Text>
                </View>
              </View>

              <Divider margin={spacing.sm} />

              <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Detected Summary</Text>
              <Text style={[styles.detailValue, { color: palette.text.primary }]}>
                {selectedScan?.detectedSummary || 'No summary available'}
              </Text>

              <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Detected Conditions</Text>
              {(selectedScan?.diseases || []).length > 0 ? (
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
              )}

              <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Recommendations</Text>
              {recommendationItems.length > 0 ? (
                <View style={styles.recoWrap}>
                  {recommendationItems.map((item, idx) => (
                    <View key={`rec-${idx}`} style={styles.recoRow}>
                      <Ionicons name="checkmark-circle" size={14} color={palette.status.success} />
                      <Text style={[styles.recoText, { color: palette.text.primary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.detailValue, { color: palette.text.secondary }]}>No recommendation available.</Text>
              )}

              <EnhancedButton
                label="Delete Scan History"
                type="danger"
                icon="trash-outline"
                onPress={handleDeleteSelectedScan}
                style={styles.deleteButton}
                fullWidth
              />
              {selectedScan?.status === 'ready' ? (
                <EnhancedButton
                  label="Mark as Harvested"
                  type="primary"
                  icon="checkmark-done-outline"
                  onPress={handleMarkHarvested}
                  style={styles.markHarvestedButton}
                  fullWidth
                />
              ) : null}
            </View>
          </ScrollView>
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
    minHeight: 152,
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
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.bodyBold,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginTop: spacing.sm,
  },
  detailName: {
    ...typography.title,
    marginTop: spacing.sm,
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
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metricCard: {
    flex: 1,
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
  recoWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  recoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  recoText: {
    ...typography.body,
    flex: 1,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
  markHarvestedButton: {
    marginTop: spacing.sm,
  },
});
