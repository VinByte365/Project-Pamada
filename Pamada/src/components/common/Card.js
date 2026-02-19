import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing, shadows } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const paddingSizes = {
  none: 0,
  small: spacing.sm,
  medium: spacing.md,
  large: spacing.lg,
};

export default function Card({ children, style, padding = 'small', onPress, variant }) {
  const { palette } = useAppTheme();

  const backgroundColor =
    variant === 'success'
      ? `${palette.status.success}1A`
      : variant === 'glass'
        ? palette.surface.glass
        : palette.surface.light;

  const baseStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor: variant === 'success' ? `${palette.status.success}45` : palette.surface.border,
      padding: paddingSizes[padding] ?? paddingSizes.small,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [baseStyle, pressed ? styles.pressed : null]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    ...shadows.surface,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.94,
  },
});
