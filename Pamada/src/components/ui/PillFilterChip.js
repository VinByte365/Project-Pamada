import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function PillFilterChip({ label, icon, active, onPress }) {
  const { palette } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: active ? palette.primary.solid : palette.surface.glass,
          borderColor: active ? palette.primary.end : palette.surface.borderStrong,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon ? (
        <View style={styles.icon}>
          <Ionicons
            name={icon}
            size={14}
            color={active ? palette.primary.on : palette.text.secondary}
          />
        </View>
      ) : null}
      <Text style={[styles.text, { color: active ? palette.primary.on : palette.text.secondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
