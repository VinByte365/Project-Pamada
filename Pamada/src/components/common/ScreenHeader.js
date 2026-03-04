import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius } from '../../theme';

/**
 * ScreenHeader Component
 * Provides consistent header across screens with title, subtitle, and action buttons
 */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  centerTitle = false,
  style,
}) {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.background.base }, style]}>
      <View style={styles.content}>
        {/* Left Section - Back Button */}
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={palette.text.primary} />
          </TouchableOpacity>
        )}

        {/* Title Section */}
        <View style={centerTitle ? styles.centerContent : styles.startContent}>
          <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
          )}
        </View>

        {/* Right Section - Action Icon */}
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconButton}
          >
            {typeof rightIcon === 'string' ? (
              <Ionicons name={rightIcon} size={24} color={palette.text.primary} />
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startContent: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  title: {
    ...typography.titleLarge,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
  },
});
