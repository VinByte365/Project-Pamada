import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PillFilterChip from '../components/ui/PillFilterChip';
import PlantPreviewTile from '../components/ui/PlantPreviewTile';
import ElevatedCard from '../components/ui/ElevatedCard';
import useAppTheme from '../theme/useAppTheme';
import { spacing, typography } from '../theme';
import { useAppData } from '../contexts/AppDataContext';

const filters = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'healthy', label: 'Healthy', icon: 'checkmark-circle-outline' },
  { id: 'ready', label: 'Ready', icon: 'leaf-outline' },
  { id: 'leaf_spot', label: 'Watchlist', icon: 'warning-outline' },
];

const urgencyOf = (status) => {
  if (status === 'root_rot') return { label: 'Urgent', color: '#EF4444' };
  if (status === 'leaf_spot') return { label: 'Review Today', color: '#F59E0B' };
  if (status === 'ready') return { label: 'Harvest Soon', color: '#22C55E' };
  return { label: 'Routine Care', color: '#60A5FA' };
};

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { scans } = useAppData();
  const [filter, setFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState(null);

  const data = useMemo(() => {
    const filtered = filter === 'all' ? scans : scans.filter((scan) => scan.status === filter);
    return filtered.map((scan) => {
      const urgency = urgencyOf(scan.status);
      return {
        ...scan,
        urgency: urgency.label,
        urgencyColor: urgency.color,
      };
    });
  }, [scans, filter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text.primary }]}>Plant Library</Text>
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>Browse plants by health status and urgency</Text>
        </View>

        <ScrollView
          horizontal
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((item) => (
            <PillFilterChip
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </ScrollView>

        <ElevatedCard style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: palette.text.secondary }]}>Daily Care Summary</Text>
          <Text style={[styles.summaryValue, { color: palette.text.primary }]}>{data.length} plants in this view</Text>
        </ElevatedCard>

        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ElevatedCard style={styles.emptyCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${palette.primary.solid}14` }]}>
                <Ionicons name="leaf-outline" size={24} color={palette.primary.solid} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>Your plant library is empty</Text>
              <Text style={[styles.emptySub, { color: palette.text.secondary }]}>
                Start with a fresh scan to build organized plant records and care status insights.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: palette.primary.solid }]}
                onPress={() => navigation.navigate('Scan')}
              >
                <Ionicons name="scan-outline" size={16} color={palette.primary.on} />
                <Text style={[styles.emptyActionText, { color: palette.primary.on }]}>Start Scan</Text>
              </TouchableOpacity>
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
              {selectedScan?.date || '-'} {selectedScan?.time ? `• ${selectedScan.time}` : ''}
            </Text>
            <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Detected Summary</Text>
            <Text style={[styles.detailValue, { color: palette.text.primary }]}>
              {selectedScan?.detectedSummary || 'No summary available'}
            </Text>
            <Text style={[styles.detailLabel, { color: palette.text.secondary }]}>Confidence Level</Text>
            <Text style={[styles.detailConfidence, { color: palette.primary.solid }]}>
              {typeof selectedScan?.confidenceLevel === 'number' ? `${selectedScan.confidenceLevel}%` : 'N/A'}
            </Text>
          </View>
        </View>
      </Modal>
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
    paddingTop: spacing.xs,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  filterScroll: {
    marginBottom: spacing.md,
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
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
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
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyActionText: {
    ...typography.bodyBold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
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
  detailLabel: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    marginTop: 2,
    lineHeight: 20,
  },
  detailConfidence: {
    ...typography.title,
    marginTop: 2,
  },
});
