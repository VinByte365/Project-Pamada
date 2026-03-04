import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radius, shadows, spacing, typography } from '../theme';
import useAppTheme from '../theme/useAppTheme';

export default function ScanScreen() {
  const navigation = useNavigation();
  const { palette } = useAppTheme();

  const close = () => {
    navigation.goBack();
  };

  const openCapture = () => {
    navigation.replace('CaptureImageScan');
  };

  const openLive = () => {
    navigation.replace('LiveImaging');
  };

  return (
    <View style={styles.host}>
      <Modal
        animationType="fade"
        transparent
        visible
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surface.light,
                borderColor: palette.surface.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: palette.text.primary }]}>Scan Plant</Text>
            <Text style={[styles.subtitle, { color: palette.text.secondary }]}>
              Choose a scan mode
            </Text>

            <TouchableOpacity
              style={[
                styles.option,
                {
                  borderColor: palette.surface.borderStrong,
                  backgroundColor: palette.surface.soft,
                },
              ]}
              onPress={openCapture}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${palette.primary.solid}22` }]}>
                <Ionicons name="camera-outline" size={18} color={palette.primary.solid} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: palette.text.primary }]}>Capture Image</Text>
                <Text style={[styles.optionSub, { color: palette.text.secondary }]}>
                  Take a photo or choose from gallery
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                {
                  borderColor: palette.surface.borderStrong,
                  backgroundColor: palette.surface.soft,
                },
              ]}
              onPress={openLive}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${palette.accent.action}22` }]}>
                <Ionicons name="scan-outline" size={18} color={palette.accent.action} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: palette.text.primary }]}>Live Imaging</Text>
                <Text style={[styles.optionSub, { color: palette.text.secondary }]}>
                  Real-time on-device disease detection
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={close}>
              <Text style={[styles.cancelText, { color: palette.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sheet: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.modal,
  },
  title: {
    ...typography.titleLarge,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  option: {
    minHeight: 74,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyBold,
  },
  optionSub: {
    ...typography.caption,
    marginTop: 1,
  },
  cancelBtn: {
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  cancelText: {
    ...typography.bodyBold,
  },
});
