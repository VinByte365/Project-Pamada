import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { radius, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';
import { initializeLiveDetectionModel, runLiveDetection } from '../services/liveDetectionEngine';

const CONFIDENCE_THRESHOLD = 0.5;
const FRAME_INTERVAL_MS = 250;

const toTitle = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

function DetectionOverlay({ detections, previewSize, palette }) {
  if (!previewSize.width || !previewSize.height) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {detections.map((item, idx) => {
        const x = Math.max(0, Math.min(previewSize.width, item.bbox.xRatio * previewSize.width));
        const y = Math.max(0, Math.min(previewSize.height, item.bbox.yRatio * previewSize.height));
        const width = Math.max(1, Math.min(previewSize.width - x, item.bbox.wRatio * previewSize.width));
        const height = Math.max(1, Math.min(previewSize.height - y, item.bbox.hRatio * previewSize.height));

        return (
          <View
            key={`${item.label}-${idx}`}
            style={[
              styles.bbox,
              {
                left: x,
                top: y,
                width,
                height,
                borderColor: palette.status.warning,
              },
            ]}
          >
            <View style={[styles.bboxLabel, { backgroundColor: palette.status.warning }]}>
              <Text style={styles.bboxLabelText}>{toTitle(item.label)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function LiveImagingScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { token } = useAuth();
  const { palette } = useAppTheme();
  const cameraRef = useRef(null);
  const busyRef = useRef(false);
  const timerRef = useRef(null);
  const runningRef = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [loadingModel, setLoadingModel] = useState(true);
  const [engineError, setEngineError] = useState('');
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [detections, setDetections] = useState([]);
  const [lastResult, setLastResult] = useState({
    disease: '',
    maturity: '',
    confidence: 0,
    processingTimeMs: 0,
  });

  const statusText = useMemo(() => {
    if (loadingModel) return 'Initializing live detection...';
    if (engineError) return engineError;
    return detections.length ? 'Aloe vera detected' : 'No aloe vera detected';
  }, [detections.length, engineError, loadingModel]);

  useEffect(() => {
    let mounted = true;
    initializeLiveDetectionModel()
      .then((state) => {
        if (!mounted) return;
        setEngineError(state.error || '');
        setLoadingModel(false);
      })
      .catch(() => {
        if (!mounted) return;
        setEngineError('Unable to initialize live detection');
        setLoadingModel(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !permission?.granted || loadingModel) {
      runningRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    runningRef.current = true;

    const processNext = async () => {
      if (!runningRef.current) return;
      if (!cameraRef.current || busyRef.current || !token) {
        timerRef.current = setTimeout(processNext, FRAME_INTERVAL_MS);
        return;
      }

      busyRef.current = true;
      try {
        const frame = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          skipProcessing: true,
          base64: false,
          shutterSound: false,
        });

        const response = await runLiveDetection(frame.uri, token);
        const filtered = (response.detections || []).filter(
          (item) => Number(item.confidence || 0) >= CONFIDENCE_THRESHOLD
        );

        setDetections(filtered);
        const topLabel = filtered[0]?.label || '';
        const normalizedTop = String(topLabel).toLowerCase();
        const displayDisease = normalizedTop === 'healthy' ? '' : (response.disease || topLabel);

        setLastResult({
          disease: displayDisease,
          maturity: response.maturity || '',
          confidence: Number(response.confidence || 0),
          processingTimeMs: Number(response.processingTimeMs || 0),
        });
        setEngineError(response.error || '');
      } catch (error) {
        setEngineError(error.message || 'Live detection failed');
      } finally {
        busyRef.current = false;
      }

      if (runningRef.current) {
        timerRef.current = setTimeout(processNext, FRAME_INTERVAL_MS);
      }
    };

    processNext();

    return () => {
      runningRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFocused, loadingModel, permission?.granted, token]);

  if (!permission) return <View style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permissionWrap, { backgroundColor: palette.background.base }]}>
        <Ionicons name="camera-outline" size={54} color={palette.primary.solid} />
        <Text style={[styles.permissionTitle, { color: palette.text.primary }]}>Camera Permission Required</Text>
        <Text style={[styles.permissionBody, { color: palette.text.secondary }]}>
          Enable camera access to run live aloe vera detection.
        </Text>
        <TouchableOpacity
          style={[styles.permissionBtn, { backgroundColor: palette.primary.solid }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permissionBtnText, { color: palette.primary.on }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        animateShutter={false}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setPreviewSize({ width, height });
        }}
      />

      {detections.length > 0 ? (
        <DetectionOverlay detections={detections} previewSize={previewSize} palette={palette} />
      ) : null}

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View
          style={[
            styles.infoCard,
            {
              borderColor: 'rgba(255,255,255,0.25)',
              backgroundColor: 'rgba(6,14,10,0.6)',
            },
          ]}
        >
          <Text style={styles.infoHeading}>Live Result</Text>
          <Text style={styles.infoLine}>
            Disease: {detections.length ? (lastResult.disease ? toTitle(lastResult.disease) : 'None') : 'None'}
          </Text>
          <Text style={styles.infoLine}>
            Maturity: {lastResult.maturity ? toTitle(lastResult.maturity) : '--'}
          </Text>
          <Text style={styles.infoLine}>
            Confidence: {detections.length ? `${Math.round((lastResult.confidence || 0) * 100)}%` : '--'}
          </Text>
        </View>
      </View>

      <View style={styles.statusBar}>
        {loadingModel ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
        <Text style={styles.statusText}>{statusText}</Text>
        <Text style={styles.processingText}>
          {lastResult.processingTimeMs > 0 ? `${Math.round(lastResult.processingTimeMs)}ms` : ''}
        </Text>
      </View>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  permissionTitle: {
    ...typography.title,
    marginTop: spacing.md,
  },
  permissionBody: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  permissionBtn: {
    minHeight: 44,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtnText: {
    ...typography.bodyBold,
  },
  topBar: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    minWidth: SCREEN_WIDTH * 0.5,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoHeading: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  infoLine: {
    ...typography.caption,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: '#FFFFFF',
    flex: 1,
  },
  processingText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 10,
  },
  bboxLabel: {
    position: 'absolute',
    left: 0,
    top: -24,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: SCREEN_WIDTH * 0.72,
  },
  bboxLabelText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
