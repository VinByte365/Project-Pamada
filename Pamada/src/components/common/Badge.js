import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius } from '../../theme';

/**
 * Badge Component
 * Displays status badges with various styles and sizes
 */
export default function Badge({
  label,
  type = 'default', // 'default', 'success', 'error', 'warning', 'info'
  size = 'medium', // 'small', 'medium', 'large'
  icon,
  variant = 'filled', // 'filled' or 'outline'
  style,
}) {
  const { palette } = useAppTheme();

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: palette.status.success,
          text: palette.primary.on,
          border: palette.status.success,
          light_bg: palette.status.success + '15',
        };
      case 'error':
        return {
          bg: palette.status.danger,
          text: palette.primary.on,
          border: palette.status.danger,
          light_bg: palette.status.danger + '15',
        };
      case 'warning':
        return {
          bg: palette.status.warning,
          text: palette.primary.on,
          border: palette.status.warning,
          light_bg: palette.status.warning + '15',
        };
      case 'info':
        return {
          bg: palette.status.info,
          text: palette.primary.on,
          border: palette.status.info,
          light_bg: palette.status.info + '15',
        };
      default:
        return {
          bg: palette.surface.glass,
          text: palette.text.primary,
          border: palette.surface.borderStrong,
          light_bg: palette.surface.soft,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: 4, typography: typography.caption };
      case 'large':
        return { padding: spacing.sm, typography: typography.bodyMedium };
      default:
        return { padding: spacing.xs, typography: typography.caption };
    }
  };

  const colors = getColors();
  const sizeStyles = getSizeStyles();

  const backgroundColor = variant === 'filled' ? colors.bg : colors.light_bg;
  const textColor = variant === 'filled' ? colors.text : colors.bg;
  const borderColor = variant === 'filled' ? 'transparent' : colors.border;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          borderColor,
          paddingHorizontal: sizeStyles.padding + 8,
          paddingVertical: sizeStyles.padding,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizeStyles.typography.fontSize + 2}
          color={textColor}
          style={{ marginRight: spacing.xxs }}
        />
      )}
      <Text
        style={[
          sizeStyles.typography,
          {
            color: textColor,
            fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
