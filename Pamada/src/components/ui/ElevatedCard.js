import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, shadows } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function ElevatedCard({ children, style, onPress, gradient = false, floating = false }) {
  const { palette } = useAppTheme();

  const content = gradient ? (
    <LinearGradient
      colors={[palette.surface.light, palette.surface.soft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientFill}
    >
      {children}
    </LinearGradient>
  ) : (
    children
  );

  const baseStyle = [
    styles.base,
    {
      backgroundColor: gradient ? 'transparent' : palette.surface.elevated,
      borderColor: palette.surface.border,
    },
    floating ? shadows.floating : shadows.surface,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyle, pressed ? styles.pressed : null]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
