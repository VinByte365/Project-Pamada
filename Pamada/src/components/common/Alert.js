import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppTheme from '../../theme/useAppTheme';
import { spacing, typography, radius, shadows } from '../../theme';

/**
 * Alert Component
 * Displays informational, warning, error, or success alerts
 */
export default function Alert({
  type = 'info', // 'info', 'success', 'warning', 'error'
  title,
  message,
  dismissible = false,
  onDismiss,
  style,
}) {
  const { palette } = useAppTheme();
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  const getColorScheme = () => {
    switch (type) {
      case 'success':
        return {
          bg: palette.status.success + '15',
          border: palette.status.success,
          icon: 'checkmark-circle',
          color: palette.status.success,
        };
      case 'warning':
        return {
          bg: palette.status.warning + '15',
          border: palette.status.warning,
          icon: 'alert-circle',
          color: palette.status.warning,
        };
      case 'error':
        return {
          bg: palette.status.danger + '15',
          border: palette.status.danger,
          icon: 'close-circle',
          color: palette.status.danger,
        };
      default:
        return {
          bg: palette.status.info + '15',
          border: palette.status.info,
          icon: 'information-circle',
          color: palette.status.info,
        };
    }
  };

  const colors = getColorScheme();

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Ionicons
        name={colors.icon}
        size={20}
        color={colors.color}
        style={styles.icon}
      />

      <View style={styles.content}>
        {title && (
          <Text
            style={[
              styles.title,
              { color: palette.text.primary },
            ]}
          >
            {title}
          </Text>
        )}
        {message && (
          <Text
            style={[
              styles.message,
              { color: palette.text.secondary },
            ]}
          >
            {message}
          </Text>
        )}
      </View>

      {dismissible && (
        <Ionicons
          name="close"
          size={18}
          color={palette.text.secondary}
          onPress={handleDismiss}
          style={styles.closeButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  icon: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyBold,
  },
  message: {
    ...typography.caption,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
