import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function ScanFrameOverlay({ confidence = 'AI Ready' }) {
  const { palette } = useAppTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const reticle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(reticle, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(reticle, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse, reticle]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.04] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });
  const reticleShift = reticle.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.frame,
          {
            borderColor: palette.primary.solid,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.reticle,
          { backgroundColor: `${palette.primary.solid}AA`, transform: [{ translateY: reticleShift }] },
        ]}
      />

      <View style={[styles.confidence, { backgroundColor: palette.surface.glass, borderColor: palette.surface.borderStrong }]}>
        <Ionicons name="sparkles" size={12} color={palette.accent.action} />
        <Text style={[styles.confidenceText, { color: palette.text.primary }]}>{confidence}</Text>
      </View>

      <Text style={[styles.hint, { color: '#FFFFFF' }]}>Align Aloe Vera leaf in frame</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '72%',
    aspectRatio: 1,
    borderRadius: radius.card,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  reticle: {
    position: 'absolute',
    width: '54%',
    height: 2,
    borderRadius: radius.pill,
  },
  confidence: {
    position: 'absolute',
    top: 86,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  confidenceText: {
    ...typography.caption,
    fontWeight: '700',
  },
  hint: {
    position: 'absolute',
    bottom: 134,
    ...typography.caption,
    fontWeight: '700',
  },
});
