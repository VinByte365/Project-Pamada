import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dimensions, spacing } from '../../theme';

export default function ScreenContainer({ children, style, padding = true, edges = ['top', 'bottom'] }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.contentWrap}>
        <View style={[styles.container, padding && styles.padded, style]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: Math.min(560, dimensions.width),
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  padded: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
});
