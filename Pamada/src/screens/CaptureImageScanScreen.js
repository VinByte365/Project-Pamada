import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppData } from '../contexts/AppDataContext';
import useAppTheme from '../theme/useAppTheme';
import { radius, shadows, spacing, typography } from '../theme';
import ElevatedCard from '../components/ui/ElevatedCard';
import ScanFrameOverlay from '../components/ui/ScanFrameOverlay';
import StatusBadge from '../components/ui/StatusBadge';

const CONFIDENCE_THRESHOLD = 0.45;

export default function CaptureImageScanScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  const { analyzeScanPreview, confirmScanPreview } = useAppData();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedImage, setScannedImage] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [liveConfidence, setLiveConfidence] = useState('AI Ready');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const cameraRef = useRef(null);

  const flashAvailable = facing === 'back';

  useEffect(() => {
    if (!flashAvailable && flashEnabled) {
      setFlashEnabled(false);
    }
  }, [flashAvailable, flashEnabled]);

  if (!permission) {
    return <View style={{ flex: 1 }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: palette.background.base }]}> 
        <Ionicons name="camera" size={56} color={palette.primary.solid} />
        <Text style={[styles.permissionTitle, { color: palette.text.primary }]}>Camera Permission Required</Text>
        <Text style={[styles.permissionText, { color: palette.text.secondary }]}>Enable access to scan plant leaves and run AI diagnosis.</Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: palette.primary.solid }]}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={[styles.permissionButtonText, { color: palette.primary.on }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatScanResult = (scan) => {
    const maturityStage = String(scan?.analysis_result?.maturity_stage || '');
    const noPlantDetected = maturityStage.toLowerCase().includes('no plant detected');
    const maturityAssessment = String(scan?.analysis_result?.maturity_assessment || '').toLowerCase();
    const estimatedDays = scan?.analysis_result?.estimated_days_to_harvest;
    const maturity = maturityStage
      ? (maturityStage.toLowerCase().includes('ready for harvest') || maturityStage.toLowerCase().includes('mature')
        ? 'Ready for Harvest'
        : maturityStage.toLowerCase().includes('developing') || maturityStage.toLowerCase().includes('almost ready')
          ? 'Almost Ready'
          : 'Not Ready for Harvest')
      : maturityAssessment === 'optimal' || scan?.analysis_result?.harvest_ready === true || estimatedDays === 0
        ? 'Ready for Harvest'
        : maturityAssessment === 'maturing'
          ? 'Almost Ready'
          : (maturityAssessment === 'immature' || typeof estimatedDays === 'number')
            ? 'Not Ready for Harvest'
            : 'Not Available';
    const primaryClass =
      scan?.yolo_predictions?.[0]?.class || (scan?.analysis_result?.disease_detected ? 'leaf_spot' : 'healthy');
    const normalizedDiseaseKey = String(
      scan?.recommendation_payload?.disease_key || scan?.disease_key || ''
    ).toLowerCase();
    const isHealthyResult =
      normalizedDiseaseKey === 'healthy' ||
      primaryClass === 'healthy' ||
      scan?.analysis_result?.disease_detected === false;
    const diseaseFromPayload = scan?.recommendation_payload?.disease;
    const diseaseList = !isHealthyResult && diseaseFromPayload ? [diseaseFromPayload] : [];
    const structuredRecommendations = Array.isArray(scan?.recommendation_payload?.recommendations)
      ? scan.recommendation_payload.recommendations
      : [];
    const confidenceScore = noPlantDetected
      ? 0
      : Number(scan?.recommendation_payload?.confidence ?? scan?.analysis_result?.confidence_score ?? 0);
    const belowThreshold = confidenceScore > 0 && confidenceScore < CONFIDENCE_THRESHOLD;
    const invalidPlant = noPlantDetected || belowThreshold;
    const confidence = noPlantDetected ? 'N/A' : (confidenceScore ? `${Math.round(confidenceScore * 100)}%` : 'N/A');

    return {
      maturity,
      maturityStage,
      noPlantDetected: invalidPlant,
      lowConfidence: belowThreshold,
      healthStatus: noPlantDetected ? 'leaf_spot' : (primaryClass === 'healthy' ? 'healthy' : primaryClass),
      diseases: diseaseList.length ? diseaseList : [],
      recommendations: noPlantDetected
        ? ['No plant detected. Please retake the scan with one aloe vera plant centered in frame.']
        : (structuredRecommendations.length
            ? structuredRecommendations.map((item) => item.text)
            : ['No preset recommendations configured for this disease key.']),
      confidence,
      confidenceNumber: confidenceScore ? Math.round(confidenceScore * 100) : 0,
    };
  };

  const runScan = async (imageUri) => {
    setLoading(true);
    setError('');
    setScannedImage(imageUri);
    setLiveConfidence('Analyzing...');
    setPreviewId('');
    setFlashEnabled(false);

    try {
      const preview = await analyzeScanPreview({ imageUri });
      setPreviewId(preview.preview_id || '');
      const formatted = formatScanResult(preview);
      setScanResult(formatted);
      setLiveConfidence(`Confidence ${formatted.confidence}`);
      if (formatted.noPlantDetected) {
        setError(
          formatted.lowConfidence
            ? 'Low confidence (<45%). Please retake the scan with one aloe vera plant centered in frame.'
            : 'No plant detected. Please retake the scan with one aloe vera plant centered in frame.'
        );
        setShowResults(false);
      } else {
        setShowResults(true);
      }
    } catch (err) {
      setError(err.message || 'Unable to analyze image.');
      setLiveConfidence('AI Ready');
    } finally {
      setLoading(false);
    }
  };

  const saveScanRecord = async () => {
    if (!previewId || !scanResult || scanResult.noPlantDetected || savingRecord) return;
    setSavingRecord(true);
    try {
      const createdScan = await confirmScanPreview({ previewId });
      if (!createdScan?._id) {
        throw new Error('Unable to save scan record.');
      }
      setShowResults(false);
      resetScan();
      navigation.navigate('Main', { screen: 'History' });
    } catch (err) {
      setError(err.message || 'Unable to save scan record.');
    } finally {
      setSavingRecord(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || loading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setFlashEnabled(false);
      await runScan(photo.uri);
    } catch (err) {
      setError(err.message || 'Unable to capture image.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (loading) return;
    setLoading(true);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      await runScan(result.assets[0].uri);
      return;
    }

    setLoading(false);
  };

  const resetScan = () => {
    setScannedImage(null);
    setShowResults(false);
    setScanResult(null);
    setPreviewId('');
    setError('');
    setLiveConfidence('AI Ready');
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const openReportIssue = () => {
    const issueCategory = scanResult?.healthStatus === 'healthy'
      ? 'maturity_misclassification'
      : 'disease_misclassification';
    const description = [
      `Issue from scan analysis (${new Date().toLocaleString()}).`,
      scanResult?.maturityStage ? `Maturity stage: ${scanResult.maturityStage}` : '',
      scanResult?.diseases?.length ? `Detected: ${scanResult.diseases.join(', ')}` : '',
      previewId ? `Preview ID: ${previewId}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setShowResults(false);
    navigation.navigate('ReportIssue', {
      issue_category: issueCategory,
      description,
      imageUri: scannedImage || '',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background.base }]}>
      {!scannedImage ? (
        <CameraView style={styles.cameraView} facing={facing} ref={cameraRef} enableTorch={flashEnabled}>
          <LinearGradient
            colors={['rgba(6,18,10,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <ScanFrameOverlay confidence={liveConfidence} />

          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: 'rgba(14,18,16,0.6)' }]}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.topTitle}>
              <Text style={styles.topTitleText}>Capture Scan</Text>
              <Text style={styles.topSubtitle}>Align one aloe leaf within the frame</Text>
            </View>
            <View style={styles.topActions}>
              <View style={[styles.statusPill, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                <View style={[styles.statusDot, { backgroundColor: liveConfidence === 'AI Ready' ? '#6EE7B7' : '#FBBF24' }]} />
                <Text style={styles.statusText}>{liveConfidence}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: 'rgba(14,18,16,0.6)', opacity: flashAvailable ? 1 : 0.5 },
                ]}
                onPress={() => setFlashEnabled((prev) => !prev)}
                accessibilityLabel={flashEnabled ? 'Turn off flash' : 'Turn on flash'}
                disabled={!flashAvailable}
              >
                <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.hintWrap}>
            <View style={[styles.hintCard, { backgroundColor: 'rgba(10,14,12,0.6)', borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="sparkles-outline" size={16} color="#B7F5C2" />
              <Text style={styles.hintText}>Good light and a steady hand improve detection accuracy.</Text>
            </View>
          </View>

          <View style={styles.controlsWrap}>
            <View style={[styles.controls, { backgroundColor: 'rgba(12,16,14,0.78)', borderColor: 'rgba(255,255,255,0.2)' }]}>
              <TouchableOpacity style={styles.controlButton} onPress={pickImage} accessibilityLabel="Pick image">
                <Ionicons name="images-outline" size={22} color="#FFFFFF" />
                <Text style={styles.controlLabel}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, { borderColor: '#FFFFFF' }]}
                onPress={takePicture}
                disabled={loading}
                accessibilityLabel="Capture image"
              >
                <LinearGradient
                  colors={[palette.primary.start, palette.primary.end]}
                  style={styles.captureInner}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing} accessibilityLabel="Switch camera">
                <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: scannedImage }} style={styles.previewImage} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.previewFade} />

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={palette.primary.solid} />
              <Text style={styles.loadingText}>Analyzing plant health...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.loadingOverlay}>
              <Ionicons name="alert-circle" size={28} color={palette.status.warning} />
              <Text style={styles.loadingText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.previewControls}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
              onPress={resetScan}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: palette.primary.solid }]}
              onPress={() => scanResult && setShowResults(true)}
              disabled={!scanResult || scanResult.noPlantDetected}
            >
              <Ionicons name="analytics-outline" size={18} color={palette.primary.on} />
              <Text style={[styles.previewButtonText, { color: palette.primary.on }]}>View Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showResults} animationType="slide" transparent onRequestClose={() => setShowResults(false)}>
        <View style={styles.modalBackDrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface.light, borderColor: palette.surface.border, shadowColor: '#000000' }]}>
            <View style={[styles.handle, { backgroundColor: palette.surface.borderStrong }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text.primary }]}>Scan Analysis</Text>
              <TouchableOpacity onPress={() => setShowResults(false)} accessibilityLabel="Close analysis">
                <Ionicons name="close" size={22} color={palette.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {scanResult ? (
                <>
                  <ElevatedCard style={styles.heroResultCard}>
                    <View style={styles.heroRow}>
                      <StatusBadge
                        status={scanResult.healthStatus}
                        label={scanResult.noPlantDetected ? 'No Plant Detected' : (scanResult.healthStatus === 'healthy' ? 'Healthy' : 'Detected Issue')}
                      />
                      <Text style={[styles.confidenceLabel, { color: palette.text.secondary }]}>{scanResult.confidence}</Text>
                    </View>
                    <View style={styles.maturityCenter}>
                      <Text style={[styles.maturityTitle, { color: palette.text.secondary }]}>Harvest Readiness</Text>
                      <Text
                        style={[
                          styles.maturityValue,
                          {
                            color: scanResult.maturity === 'Ready for Harvest'
                              ? palette.status.success
                              : palette.status.warning,
                          },
                        ]}
                      >
                        {scanResult.maturity}
                      </Text>
                      {scanResult.maturityStage ? (
                        <Text style={[styles.maturitySub, { color: palette.text.tertiary }]}>{scanResult.maturityStage}</Text>
                      ) : null}
                    </View>
                  </ElevatedCard>

                  {scanResult.diseases.length > 0 ? (
                    <ElevatedCard style={styles.sectionCard}>
                      <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Detected Diseases</Text>
                      <View style={styles.listWrap}>
                        {scanResult.diseases.map((disease, index) => (
                          <View key={`${disease}-${index}`} style={styles.rowItem}>
                            <Ionicons name="warning" size={16} color={palette.status.warning} />
                            <Text style={[styles.rowText, { color: palette.text.secondary }]}>{disease}</Text>
                          </View>
                        ))}
                      </View>
                    </ElevatedCard>
                  ) : null}

                  <ElevatedCard style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Recommendations</Text>
                    <View style={styles.listWrap}>
                      {scanResult.recommendations.map((rec, index) => (
                        <View key={`${index}`} style={styles.rowItem}>
                          <Ionicons name="checkmark-circle" size={16} color={palette.status.success} />
                          <Text style={[styles.rowText, { color: palette.text.secondary }]}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </ElevatedCard>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: scanResult.noPlantDetected || savingRecord || !previewId ? palette.surface.soft : palette.primary.solid },
                    ]}
                    onPress={saveScanRecord}
                    disabled={scanResult.noPlantDetected || savingRecord || !previewId}
                  >
                    <Text
                      style={[
                        styles.saveText,
                        { color: scanResult.noPlantDetected || savingRecord || !previewId ? palette.text.secondary : palette.primary.on },
                      ]}
                    >
                      {scanResult.noPlantDetected
                        ? 'Cannot Save - No Plant Detected'
                        : !previewId
                          ? 'Analysis Incomplete'
                        : savingRecord
                          ? 'Saving Record...'
                          : 'Save to Plant Library'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reportIssueButton, { borderColor: palette.surface.borderStrong, backgroundColor: palette.surface.soft }]}
                    onPress={openReportIssue}
                  >
                    <Ionicons name="flag-outline" size={16} color={palette.text.primary} />
                    <Text style={[styles.reportIssueText, { color: palette.text.primary }]}>Report Issue</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  permissionTitle: {
    ...typography.title,
    marginTop: spacing.md,
  },
  permissionText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  permissionButton: {
    minHeight: 44,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  permissionButtonText: {
    ...typography.bodyBold,
  },
  cameraView: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topTitleText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  topSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  statusPill: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: 'rgba(14,18,16,0.6)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hintWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 150,
    alignItems: 'center',
  },
  hintCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: '#E6F6EC',
    flex: 1,
    lineHeight: 16,
  },
  controlsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    alignItems: 'center',
  },
  controls: {
    width: '90%',
    minHeight: 96,
    borderRadius: radius.floating,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  controlButton: {
    width: 72,
    height: 68,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  controlLabel: {
    ...typography.caption,
    color: '#FFFFFF',
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  previewControls: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radius.button,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    borderRadius: radius.button,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackDrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: radius.floating,
    borderTopRightRadius: radius.floating,
    borderWidth: 1,
    maxHeight: '84%',
    ...shadows.modal,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  modalHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.title,
  },
  modalContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  heroResultCard: {
    padding: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  confidenceLabel: {
    ...typography.caption,
  },
  maturityCenter: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  maturityTitle: {
    ...typography.caption,
    fontWeight: '700',
  },
  maturityValue: {
    ...typography.bodyBold,
    fontSize: 18,
    textAlign: 'center',
  },
  maturitySub: {
    ...typography.caption,
    textAlign: 'center',
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  listWrap: {
    gap: spacing.xs,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  rowText: {
    ...typography.body,
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  saveText: {
    ...typography.bodyBold,
  },
  reportIssueButton: {
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reportIssueText: {
    ...typography.bodyBold,
  },
});
