import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius } from '../../theme';

/**
 * Chip Component
 * Interactive tag/chip component with optional icon and delete button
 */
export default function Chip({
  label,
  onPress,
  onDelete,
  icon,
  selected = false,
  disabled = false,
  variant = 'filled', // 'filled' or 'outlined'
  size = 'medium', // 'small' or 'medium'
  color = 'primary', // 'primary', 'success', 'warning', 'error'
  style,
}) {
  const { palette } = useAppTheme();

  const getColorScheme = () => {
    switch (color) {
      case 'success':
        return {
          bg: palette.status.success,
          text: palette.primary.on,
          light_bg: palette.status.success + '20',
          border: palette.status.success,
        };
      case 'warning':
        return {
          bg: palette.status.warning,
          text: palette.primary.on,
          light_bg: palette.status.warning + '20',
          border: palette.status.warning,
        };
      case 'error':
        return {
          bg: palette.status.danger,
          text: palette.primary.on,
          light_bg: palette.status.danger + '20',
          border: palette.status.danger,
        };
      default:
        return {
          bg: palette.primary.start,
          text: palette.primary.on,
          light_bg: palette.primary.start + '20',
          border: palette.primary.start,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 4,
          paddingHorizontal: spacing.sm,
          gap: 4,
          fontSize: typography.caption.fontSize,
        };
      default:
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          fontSize: typography.bodyMedium.fontSize,
        };
    }
  };

  const colors = getColorScheme();
  const sizeStyles = getSizeStyles();

  const backgroundColor = variant === 'filled'
    ? selected ? colors.bg : colors.light_bg
    : 'transparent';
  const textColor = variant === 'filled'
    ? selected ? colors.text : colors.bg
    : colors.border;
  const borderColor = colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor,
          borderColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderWidth: variant === 'outlined' ? 1 : 0,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizeStyles.fontSize + 2}
          color={textColor}
        />
      )}

      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontSize: sizeStyles.fontSize,
            fontWeight: selected ? '700' : '600',
          },
        ]}
      >
        {label}
      </Text>

      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteButton}
        >
          <Ionicons
            name="close"
            size={sizeStyles.fontSize + 4}
            color={textColor}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  label: {
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});
