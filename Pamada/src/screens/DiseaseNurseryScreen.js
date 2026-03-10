import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ElevatedCard from '../components/ui/ElevatedCard';
import useAppTheme from '../theme/useAppTheme';
import { getTheme, radius, spacing, typography } from '../theme';
import { useAppData } from '../contexts/AppDataContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const toTitle = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function DiseaseNurseryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useAppTheme();
  const palette = theme?.palette || getTheme('light');
  const { showSnackbar } = useSnackbar();
  const {
    fetchScanRecommendations,
    setScanRecommendationCompletion,
    fetchDiseaseCatalog,
    setScanProgress,
  } = useAppData();

  const scanId = route.params?.scanId || '';
  const plantName = route.params?.plantName || 'Aloe Vera Plant';

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [recommendationPayload, setRecommendationPayload] = useState(null);
  const [diseaseCatalog, setDiseaseCatalog] = useState([]);
  const [carePlanState, setCarePlanState] = useState(null);

  const scanRecommendations = useMemo(
    () => (Array.isArray(recommendationPayload?.recommendations) ? recommendationPayload.recommendations : []),
    [recommendationPayload]
  );

  const currentDiseaseName = recommendationPayload?.disease || '';
  const currentDiseaseKey = recommendationPayload?.disease_key || '';

  const completionRate = useMemo(() => {
    const apiRate = recommendationPayload?.progress?.completion_rate;
    if (typeof apiRate === 'number') return apiRate;
    if (carePlanState?.all_completed) return 100;
    if (!scanRecommendations.length) return 0;
    const done = scanRecommendations.filter((row) => row.completed).length;
    return Math.round((done / scanRecommendations.length) * 100);
  }, [scanRecommendations, carePlanState, recommendationPayload]);

  const completionColor = completionRate >= 80
    ? palette.status.success
    : completionRate >= 45
      ? palette.status.warning
      : palette.status.info;

  const catalogCards = useMemo(() => {
    const normalizedCurrent = String(currentDiseaseName || '').toLowerCase();
    return diseaseCatalog.map((item) => {
      const displayName = item.display_name || item.disease_name || 'Unknown Disease';
      return {
        id: item._id || displayName,
        displayName,
        diseaseName: item.disease_name || '',
        description: item.description || 'No description available.',
        symptoms: Array.isArray(item.symptoms) ? item.symptoms.slice(0, 3) : [],
        isCurrent:
          String(displayName).toLowerCase() === normalizedCurrent ||
          String(item.disease_name || '').toLowerCase() === String(currentDiseaseKey || '').toLowerCase(),
      };
    });
  }, [diseaseCatalog, currentDiseaseName, currentDiseaseKey]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!scanId) {
        setLoading(false);
        return;
      }
      try {
        const [scanPayload, diseases] = await Promise.all([
          fetchScanRecommendations(scanId),
          fetchDiseaseCatalog(),
        ]);
        if (!mounted) return;
        setRecommendationPayload(scanPayload || null);
        setCarePlanState(scanPayload?.progress || null);
        setDiseaseCatalog(Array.isArray(diseases) ? diseases : []);
      } catch (error) {
        if (!mounted) return;
        showSnackbar({ type: 'error', message: error.message || 'Unable to load disease nursery data.' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [scanId, fetchScanRecommendations, fetchDiseaseCatalog, showSnackbar]);

  useEffect(() => {
    if (!scanId) return;
    setScanProgress(scanId, completionRate);
  }, [scanId, completionRate, setScanProgress]);

  const toggleRecommendation = async (item) => {
    if (!scanId || !item?.id) return;
    const nextCompleted = !Boolean(item.completed);
    setUpdatingId(String(item.id));
    try {
      const updateResult = await setScanRecommendationCompletion({
        scanId,
        recommendationId: item.id,
        completed: nextCompleted,
      });
      if (updateResult?.care_plan) {
        setCarePlanState(updateResult.care_plan);
        if (updateResult.care_plan.all_completed) {
          showSnackbar({ type: 'success', message: 'Care plan completed. Please run a new scan.' });
        }
      }
      setRecommendationPayload((prev) => {
        if (!prev || !Array.isArray(prev.recommendations)) return prev;
        return {
          ...prev,
          recommendations: prev.recommendations.map((row) =>
            String(row.id) === String(item.id)
              ? {
                  ...row,
                  completed: nextCompleted,
                  completed_at: nextCompleted ? new Date().toISOString() : null,
                }
              : row
          ),
        };
      });
    } catch (error) {
      showSnackbar({ type: 'error', message: error.message || 'Unable to update recommendation.' });
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background.base }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: palette.surface.soft }]}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={palette.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: palette.text.primary }]}>Disease Nursery</Text>
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>{plantName}</Text>
        </View>
        <View style={[styles.headerPill, { backgroundColor: `${palette.primary.solid}12` }]}>
          <Ionicons name="leaf-outline" size={14} color={palette.primary.solid} />
          <Text style={[styles.headerPillText, { color: palette.primary.solid }]}>Care Hub</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary.solid} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ElevatedCard style={[styles.currentCard, { borderColor: palette.surface.border }]}>
            <View style={styles.currentHeader}>
              <View style={[styles.currentBadge, { backgroundColor: `${palette.primary.solid}12` }]}>
                <Ionicons name="pulse-outline" size={16} color={palette.primary.solid} />
                <Text style={[styles.currentBadgeText, { color: palette.primary.solid }]}>Post-Scan Care Plan</Text>
              </View>
              <View style={[styles.severityPill, { backgroundColor: `${completionColor}18` }]}>
                <Text style={[styles.severityText, { color: completionColor }]}>{completionRate}% Complete</Text>
              </View>
            </View>
            <Text style={[styles.currentDisease, { color: palette.text.primary }]}>
              {currentDiseaseName || 'Unknown disease'}
            </Text>
            <Text style={[styles.meta, { color: palette.text.secondary }]}>
              Confidence {Math.round(Number(recommendationPayload?.confidence || 0) * 100)}% · {toTitle(recommendationPayload?.severity || 'medium')} severity
            </Text>
            {recommendationPayload?.dynamic_context?.advisory ? (
              <Text style={[styles.meta, { color: palette.text.secondary }]}>
                {recommendationPayload.dynamic_context.advisory}
              </Text>
            ) : null}
            <View style={styles.metricStrip}>
              <View style={[styles.metricTile, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Rescan By</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {recommendationPayload?.dynamic_context?.recommended_rescan_by
                    ? new Date(recommendationPayload.dynamic_context.recommended_rescan_by).toLocaleDateString()
                    : '—'}
                </Text>
              </View>
              <View style={[styles.metricTile, { borderColor: palette.surface.border, backgroundColor: palette.surface.soft }]}>
                <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Priority</Text>
                <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                  {scanRecommendations.length ? toTitle(scanRecommendations[0]?.priority || 'medium') : 'Medium'}
                </Text>
              </View>
            </View>
            {carePlanState?.all_completed ? (
              <View
                style={[
                  styles.completionBanner,
                  { backgroundColor: `${palette.status.success}16`, borderColor: `${palette.status.success}55` },
                ]}
              >
                <Ionicons name="sparkles-outline" size={16} color={palette.status.success} />
                <Text style={[styles.completionText, { color: palette.status.success }]}>
                  Care plan completed. Capture a new scan to confirm recovery.
                </Text>
                <TouchableOpacity
                  style={[styles.scanAgainButton, { backgroundColor: palette.status.success }]}
                  onPress={() => navigation.navigate('Scan')}
                >
                  <Text style={[styles.scanAgainText, { color: '#FFFFFF' }]}>Scan</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ElevatedCard>

          <ElevatedCard style={[styles.sectionCard, { borderColor: palette.surface.border }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Action Checklist</Text>
              <View style={[styles.sectionPill, { backgroundColor: palette.surface.soft, borderColor: palette.surface.border }]}>
                <Ionicons name="list-outline" size={14} color={palette.text.secondary} />
                <Text style={[styles.sectionPillText, { color: palette.text.secondary }]}>{scanRecommendations.length} Tasks</Text>
              </View>
            </View>
            {scanRecommendations.length > 0 ? (
              <View style={styles.recoWrap}>
                {scanRecommendations.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[
                      styles.recoRow,
                      {
                        borderColor: item.completed ? `${palette.status.success}40` : palette.surface.border,
                        backgroundColor: item.completed ? `${palette.status.success}10` : palette.surface.soft,
                      },
                    ]}
                    onPress={() => toggleRecommendation(item)}
                    disabled={updatingId === String(item.id)}
                  >
                    <Ionicons
                      name={item.completed ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={item.completed ? palette.status.success : palette.text.tertiary}
                    />
                    <View style={styles.recoTextWrap}>
                      <Text
                        style={[
                          styles.recoText,
                          {
                            color: item.completed ? palette.text.secondary : palette.text.primary,
                            textDecorationLine: item.completed ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {item.text}
                      </Text>
                      <View style={styles.recoMetaRow}>
                        <View style={[styles.priorityPill, { borderColor: palette.surface.borderStrong }]}>
                          <Text style={[styles.recoMeta, { color: palette.text.tertiary }]}>
                            {toTitle(item.priority)} priority
                          </Text>
                        </View>
                        {item.is_required ? (
                          <View style={[styles.requiredPill, { backgroundColor: `${palette.status.warning}20` }]}>
                            <Text style={[styles.recoMeta, { color: palette.status.warning }]}>Required</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.meta, { color: palette.text.secondary }]}>No preset recommendations found.</Text>
            )}
          </ElevatedCard>

          <ElevatedCard style={[styles.sectionCard, { borderColor: palette.surface.border }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Aloe Disease Nursery</Text>
              <View style={[styles.sectionPill, { backgroundColor: palette.surface.soft, borderColor: palette.surface.border }]}>
                <Ionicons name="book-outline" size={14} color={palette.text.secondary} />
                <Text style={[styles.sectionPillText, { color: palette.text.secondary }]}>Reference</Text>
              </View>
            </View>
            <Text style={[styles.sectionHint, { color: palette.text.secondary }]}>
              Reference cards for common aloe vera diseases.
            </Text>
            <View style={styles.catalogWrap}>
              {catalogCards.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.catalogCard,
                    {
                      borderColor: item.isCurrent ? palette.primary.solid : palette.surface.border,
                      backgroundColor: item.isCurrent ? `${palette.primary.solid}10` : palette.surface.soft,
                    },
                  ]}
                >
                  <View style={styles.catalogHead}>
                    <View style={styles.catalogTitleWrap}>
                      <View style={[styles.catalogIcon, { backgroundColor: `${palette.primary.solid}12` }]}>
                        <Ionicons name="medkit-outline" size={16} color={palette.primary.solid} />
                      </View>
                      <Text style={[styles.catalogTitle, { color: palette.text.primary }]}>{item.displayName}</Text>
                    </View>
                    {item.isCurrent ? (
                      <View style={[styles.currentTag, { backgroundColor: palette.primary.solid }]}>
                        <Text style={[styles.currentTagText, { color: palette.primary.on }]}>Current</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.catalogDescription, { color: palette.text.secondary }]}>{item.description}</Text>
                  {item.symptoms.length > 0 ? (
                    <View style={styles.symptomWrap}>
                      {item.symptoms.map((symptom, idx) => (
                        <Text key={`${item.id}-${idx}`} style={[styles.symptomText, { color: palette.text.tertiary }]}>
                          - {symptom}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </ElevatedCard>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  headerPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  currentCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  currentBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  severityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  severityText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionLabel: {
    ...typography.caption,
  },
  currentDisease: {
    ...typography.bodyBold,
    marginTop: spacing.xxs,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  metricStrip: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricTile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  metricLabel: {
    ...typography.caption,
  },
  metricValue: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  completionBanner: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completionText: {
    ...typography.caption,
    flex: 1,
    fontWeight: '700',
  },
  scanAgainButton: {
    minHeight: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  scanAgainText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sectionPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionHint: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  recoWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  recoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  recoTextWrap: {
    flex: 1,
  },
  recoText: {
    ...typography.body,
    lineHeight: 20,
  },
  recoMeta: {
    ...typography.caption,
  },
  recoMetaRow: {
    marginTop: spacing.xxs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  priorityPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  requiredPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  catalogWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  catalogCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  catalogHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  catalogTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  catalogIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogTitle: {
    ...typography.bodyBold,
    flex: 1,
  },
  currentTag: {
    minHeight: 22,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  currentTagText: {
    ...typography.caption,
    fontWeight: '700',
  },
  catalogDescription: {
    ...typography.body,
    marginTop: spacing.xxs,
  },
  symptomWrap: {
    marginTop: spacing.xs,
    gap: 2,
  },
  symptomText: {
    ...typography.caption,
  },
});

