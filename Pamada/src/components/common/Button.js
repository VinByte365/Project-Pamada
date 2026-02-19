import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { motion, radius, shadows, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function Button({
  label,
  onPress,
  type = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
}) {
  const { palette } = useAppTheme();
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) => {
    Animated.timing(scale, {
      toValue,
      duration: motion.buttonPress,
      useNativeDriver: true,
    }).start();
  };

  const contentColor = type === 'secondary' ? palette.text.primary : palette.accent.on;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={[styles.wrap, isDisabled && styles.disabled]}
      >
        {type === 'secondary' ? (
          <View style={[styles.secondary, { backgroundColor: palette.surface.glass, borderColor: palette.surface.borderStrong }]}>
            <View style={styles.row}>
              {icon ? <View style={styles.icon}>{icon}</View> : null}
              {loading ? <ActivityIndicator color={contentColor} /> : <Text style={[styles.label, { color: contentColor }]}>{label}</Text>}
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={[palette.accent.action, '#6E8A72']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.base}
          >
            <View style={styles.row}>
              {icon ? <View style={styles.icon}>{icon}</View> : null}
              {loading ? <ActivityIndicator color={contentColor} /> : <Text style={[styles.label, { color: contentColor }]}>{label}</Text>}
            </View>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.button,
    overflow: 'hidden',
    ...shadows.surface,
  },
  base: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodyBold,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
});
