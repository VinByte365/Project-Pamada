import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { motion, radius, shadows, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

/**
 * EnhancedButton Component
 * Improved button with more variants and states
 */
export default function EnhancedButton({
  label,
  onPress,
  type = 'primary', // 'primary', 'secondary', 'tertiary', 'danger'
  size = 'medium', // 'small', 'medium', 'large'
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left', // 'left', 'right'
  fullWidth = false,
  style,
  onLongPress,
}) {
  const { palette } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animate = (toValue) => {
    Animated.timing(scale, {
      toValue,
      duration: motion.buttonPress,
      useNativeDriver: true,
    }).start();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          height: 36,
          paddingHorizontal: spacing.md,
          textStyle: typography.caption,
        };
      case 'large':
        return {
          height: 56,
          paddingHorizontal: spacing.lg,
          textStyle: typography.bodyBold,
        };
      default:
        return {
          height: 48,
          paddingHorizontal: spacing.lg,
          textStyle: typography.bodyBold,
        };
    }
  };

  const getColorScheme = () => {
    switch (type) {
      case 'secondary':
        return {
          bg: palette.surface.soft,
          text: palette.text.primary,
          border: palette.surface.borderStrong,
          gradient: null,
        };
      case 'tertiary':
        return {
          bg: 'transparent',
          text: palette.primary.start,
          border: palette.primary.start,
          gradient: null,
        };
      case 'danger':
        return {
          bg: palette.status.danger,
          text: palette.primary.on,
          border: 'transparent',
          gradient: null,
        };
      default:
        return {
          bg: palette.primary.start,
          text: palette.primary.on,
          border: 'transparent',
          gradient: [palette.primary.start, palette.primary.end],
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const colors = getColorScheme();

  const content = (
    <View style={[styles.content, iconPosition === 'right' && styles.contentReverse]}>
      {icon && (
        <View style={styles.iconContainer}>
          {typeof icon === 'string' ? (
            <Ionicons name={icon} size={18} color={colors.text} />
          ) : (
            icon
          )}
        </View>
      )}
      {!loading && (
        <Text style={[sizeStyles.textStyle, { color: colors.text }]}>
          {label}
        </Text>
      )}
      {loading && (
        <ActivityIndicator color={colors.text} size="small" />
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          width: fullWidth ? '100%' : 'auto',
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={isDisabled}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        style={[isDisabled && styles.disabled]}
      >
        {colors.gradient ? (
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.button,
              {
                height: sizeStyles.height,
                paddingHorizontal: sizeStyles.paddingHorizontal,
              },
            ]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.button,
              {
                height: sizeStyles.height,
                paddingHorizontal: sizeStyles.paddingHorizontal,
                backgroundColor: colors.bg,
                borderWidth: type === 'tertiary' ? 1.5 : 0,
                borderColor: colors.border,
              },
            ]}
          >
            {content}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contentReverse: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
