import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { motion, radius, shadows, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function FloatingActionButton({ label = 'Scan Plant', onPress }) {
  const { palette } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue, duration) => {
    Animated.timing(scale, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.wrap, shadows.floating, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(0.95, motion.buttonPress)}
        onPressOut={() => animate(1, motion.buttonPress)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <LinearGradient
          colors={[palette.primary.start, palette.primary.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <View style={styles.inner}>
            <Ionicons name="scan-outline" size={20} color={palette.primary.on} />
            <Text style={[styles.label, { color: palette.primary.on }]}>{label}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.floating,
  },
  button: {
    minHeight: 56,
    minWidth: 150,
    borderRadius: radius.floating,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
  },
});
