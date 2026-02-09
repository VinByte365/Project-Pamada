import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppData } from '../contexts/AppDataContext';
import { colors, spacing, radius, typography, shadows } from '../theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  permissionIconWrapper: {
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.title,
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  permissionDescription: {
    ...typography.body,
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  permissionButtonText: {
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(47, 143, 78, 0.4)',
    backgroundColor: 'transparent',
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  cornerMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: 'rgba(47, 143, 78, 0.8)',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  scanHintText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  controlButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  previewImage: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewControls: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    gap: spacing.sm,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  resultsModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  resultsContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultsTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  resultsBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  healthStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  healthStatusBadgeHealthy: {
    backgroundColor: '#ECFDF5',
  },
  healthStatusBadgeProblem: {
    backgroundColor: '#FFFBEB',
  },
  healthStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  healthStatusTextHealthy: {
    color: '#047857',
  },
  healthStatusTextProblem: {
    color: '#B45309',
  },
  maturityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  maturityBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  maturityFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  maturityText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 50,
  },
  diseaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  diseaseText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  recommendationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 18,
  },
  confidenceCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBFBEE',
    backgroundColor: '#ECFDF5',
  },
  confidenceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  confidenceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: colors.white,
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default function ScanScreen() {
  const navigation = useNavigation();
  const { addScan } = useAppData();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedImage, setScannedImage] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIconWrapper}>
          <Ionicons name="camera" size={64} color={colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionDescription}>
          We need your permission to use the camera for plant scanning.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setScannedImage(photo.uri);

        setTimeout(() => {
          const result = {
            maturity: '87%',
            maturityPercent: 87,
            healthStatus: 'healthy',
            diseases: [],
            recommendations: [
              'Plant is healthy and growing well',
              'Expected harvest in 2-3 weeks',
              'Maintain current watering schedule',
            ],
            confidence: '94%',
          };
          setScanResult(result);
          addScan({
            plantName: 'Field Scan - New',
            date: '2026-02-07',
            time: '04:45 PM',
            status: 'healthy',
            maturity: result.maturity,
            maturityPercent: result.maturityPercent,
            image: photo.uri,
            diseases: result.diseases,
          });
          setShowResults(true);
          setLoading(false);
        }, 1800);
      } catch (error) {
        setLoading(false);
      }
    }
  };

  const pickImage = async () => {
    setLoading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setScannedImage(result.assets[0].uri);
      setTimeout(() => {
        const analysis = {
          maturity: '92%',
          maturityPercent: 92,
          healthStatus: 'leaf_spot',
          diseases: ['Leaf Spot detected'],
          recommendations: [
            'Apply fungicide treatment',
            'Isolate plant if possible',
            'Reduce watering frequency',
          ],
          confidence: '89%',
        };
        setScanResult(analysis);
        addScan({
          plantName: 'Gallery Scan - New',
          date: '2026-02-07',
          time: '04:52 PM',
          status: 'leaf_spot',
          maturity: analysis.maturity,
          maturityPercent: analysis.maturityPercent,
          image: result.assets[0].uri,
          diseases: analysis.diseases,
        });
        setShowResults(true);
        setLoading(false);
      }, 1800);
    } else {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setScannedImage(null);
    setShowResults(false);
    setScanResult(null);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const renderCamera = () => (
    <CameraView
      style={styles.cameraContainer}
      facing={facing}
      ref={cameraRef}
    >
      <View style={styles.scanFrameContainer}>
        <View style={styles.scanFrame}>
          <View style={[styles.cornerMarker, styles.cornerTopLeft]} />
          <View style={[styles.cornerMarker, styles.cornerTopRight]} />
          <View style={[styles.cornerMarker, styles.cornerBottomLeft]} />
          <View style={[styles.cornerMarker, styles.cornerBottomRight]} />
        </View>

        <View style={styles.scanHint}>
          <Text style={styles.scanHintText}>Align Aloe Vera leaf within the frame</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={pickImage}>
          <Ionicons name="images-outline" size={28} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse-outline" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>
    </CameraView>
  );

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Image source={{ uri: scannedImage }} style={styles.previewImage} resizeMode="contain" />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.success} />
          <Text style={styles.loadingText}>Analyzing plant health...</Text>
        </View>
      )}

      <View style={styles.previewControls}>
        <TouchableOpacity style={styles.retakeButton} onPress={resetScan}>
          <Ionicons name="close" size={22} color={colors.white} />
          <Text style={styles.buttonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.analyzeButton} onPress={() => setShowResults(true)}>
          <Ionicons name="analytics" size={22} color={colors.white} />
          <Text style={styles.buttonText}>View Analysis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {!scannedImage ? renderCamera() : renderPreview()}

      <Modal
        visible={showResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.resultsModal}>
          <View style={styles.resultsContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Scan Results</Text>
                <TouchableOpacity onPress={() => setShowResults(false)}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {scanResult && (
                <View style={styles.resultsBody}>
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionLabel}>Health Status</Text>
                    <View
                      style={[
                        styles.healthStatusBadge,
                        scanResult.healthStatus === 'healthy'
                          ? styles.healthStatusBadgeHealthy
                          : styles.healthStatusBadgeProblem,
                      ]}
                    >
                      <Text
                        style={[
                          styles.healthStatusText,
                          scanResult.healthStatus === 'healthy'
                            ? styles.healthStatusTextHealthy
                            : styles.healthStatusTextProblem,
                        ]}
                      >
                        {scanResult.healthStatus === 'healthy' ? 'Healthy' : 'Disease Detected'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultSection}>
                    <Text style={styles.sectionLabel}>Plant Maturity</Text>
                    <View style={styles.maturityContainer}>
                      <View style={styles.maturityBar}>
                        <View
                          style={[
                            styles.maturityFill,
                            { width: `${scanResult.maturityPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.maturityText}>{scanResult.maturity}</Text>
                    </View>
                  </View>

                  {scanResult.diseases.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionLabel}>Detected Diseases</Text>
                      {scanResult.diseases.map((disease, index) => (
                        <View key={index} style={styles.diseaseItem}>
                          <Ionicons name="warning" size={20} color={colors.warning} />
                          <Text style={styles.diseaseText}>{disease}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.resultSection}>
                    <Text style={styles.sectionLabel}>Recommendations</Text>
                    {scanResult.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.confidenceCard}>
                    <Text style={styles.confidenceLabel}>AI Confidence</Text>
                    <Text style={styles.confidenceValue}>{scanResult.confidence}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                      setShowResults(false);
                      navigation.navigate('History');
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save Results</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}