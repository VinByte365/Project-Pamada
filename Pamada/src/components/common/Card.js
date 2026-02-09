import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '../../theme';

const paddingSizes = {
  none: 0,
  small: spacing.sm,
  medium: spacing.md,
  large: spacing.lg,
};

export default function Card({ children, style, padding = 'small', onPress, variant }) {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      style={[
        styles.card,
        variant === 'success' && styles.success,
        { padding: paddingSizes[padding] ?? paddingSizes.small },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  success: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
});