import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { motion, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function ProgressRing({ size = 78, strokeWidth = 9, progress = 0, label, tint }) {
  const { palette } = useAppTheme();
  const progressValue = Math.max(0, Math.min(progress, 100));
  const animated = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const id = animated.addListener(({ value }) => setDisplayed(value));
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    Animated.timing(animated, {
      toValue: progressValue,
      duration: motion.progress,
      useNativeDriver: false,
    }).start();
  }, [animated, progressValue]);

  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const offset = circumference * (1 - displayed / 100);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          stroke={palette.surface.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={tint || palette.primary.solid}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={[styles.value, { color: palette.text.primary }]}>{Math.round(displayed)}%</Text>
        {label ? <Text style={[styles.label, { color: palette.text.secondary }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    ...typography.bodyBold,
  },
  label: {
    ...typography.caption,
    marginTop: 1,
  },
});
