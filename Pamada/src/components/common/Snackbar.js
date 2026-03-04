import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius, shadows } from '../../theme';

/**
 * Snackbar Component
 * Toast-like notifications with auto-dismiss and action button
 * Usage: Show with useSnackbar() hook or directly
 */
export default function Snackbar({
  message,
  type = 'info', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  actionLabel,
  onAction,
  onDismiss,
  visible = true,
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss?.());
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      const timer = setTimeout(() => onDismiss?.(), duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: palette.status.success + '15',
          border: palette.status.success,
          text: palette.status.success,
          icon: 'checkmark-circle',
        };
      case 'error':
        return {
          bg: palette.status.danger + '15',
          border: palette.status.danger,
          text: palette.status.danger,
          icon: 'close-circle',
        };
      case 'warning':
        return {
          bg: palette.status.warning + '15',
          border: palette.status.warning,
          text: palette.status.warning,
          icon: 'alert-circle',
        };
      default:
        return {
          bg: palette.status.info + '15',
          border: palette.status.info,
          text: palette.status.info,
          icon: 'information-circle',
        };
    }
  };

  const colors = getColors();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: Math.max(spacing.lg, insets.bottom + spacing.sm) },
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        shadows.floating,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name={colors.icon}
          size={20}
          color={colors.text}
          style={styles.icon}
        />

        <Text
          style={[
            styles.message,
            { color: palette.text.primary },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {actionLabel && (
          <TouchableOpacity onPress={onAction} style={styles.action}>
            <Text
              style={[
                styles.actionText,
                { color: colors.text },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  icon: {
    marginRight: spacing.xs,
  },
  message: {
    flex: 1,
    ...typography.body,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    ...typography.bodyBold,
  },
});
