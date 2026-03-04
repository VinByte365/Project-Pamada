import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../theme/useAppTheme';
import { spacing } from '../../theme';

/**
 * Divider Component
 * Visual separator with optional label
 */
export default function Divider({
  orientation = 'horizontal', // 'horizontal' or 'vertical'
  color,
  thickness = 1,
  margin = spacing.md,
  style,
}) {
  const { palette } = useAppTheme();
  const borderColor = color || palette.surface.border;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            width: thickness,
            backgroundColor: borderColor,
            marginHorizontal: margin,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          height: thickness,
          backgroundColor: borderColor,
          marginVertical: margin,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    flex: 1,
  },
});
