import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius, shadows } from '../../theme';

/**
 * ListItem Component
 * Reusable list item with avatar, title, subtitle, and actions
 */
export default function ListItem({
  title,
  subtitle,
  avatar,
  leftIcon,
  rightIcon,
  onPress,
  onRightPress,
  badge,
  disabled = false,
  divider = true,
  style,
}) {
  const { palette } = useAppTheme();

  const isClickable = !!onPress;
  const content = (
    <>
      <View style={styles.leftSection}>
        {leftIcon && (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: palette.primary.start + '15' },
            ]}
          >
            {typeof leftIcon === 'string' ? (
              <Ionicons
                name={leftIcon}
                size={18}
                color={palette.primary.start}
              />
            ) : (
              leftIcon
            )}
          </View>
        )}

        {avatar && (
          <View
            style={[
              styles.avatar,
              { backgroundColor: palette.surface.borderStrong },
            ]}
          >
            {typeof avatar === 'string' ? (
              <Text style={[styles.avatarText, { color: palette.text.primary }]}>
                {avatar.charAt(0).toUpperCase()}
              </Text>
            ) : (
              avatar
            )}
          </View>
        )}

        <View style={styles.contentSection}>
          <Text
            style={[
              styles.title,
              { color: palette.text.primary },
              disabled && { opacity: 0.5 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: palette.text.secondary },
                disabled && { opacity: 0.5 },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {badge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: palette.status.warning },
            ]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={disabled}
          >
            {typeof rightIcon === 'string' ? (
              <Ionicons
                name={rightIcon}
                size={20}
                color={disabled ? palette.text.tertiary : palette.text.secondary}
              />
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <View style={style}>
      {isClickable ? (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.container,
              {
                borderBottomColor: divider ? palette.surface.border : 'transparent',
              },
              disabled && styles.disabled,
            ]}
          >
            {content}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.container,
            {
              borderBottomColor: divider ? palette.surface.border : 'transparent',
            },
          ]}
        >
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  contentSection: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
