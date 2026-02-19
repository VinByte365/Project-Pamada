import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAppTheme from '../theme/useAppTheme';

export default function RootLayout({ children }) {
  const { palette, isDark } = useAppTheme();

  return (
    <LinearGradient
      colors={[palette.background.base, palette.background.secondary, palette.surface.soft]}
      style={styles.container}
    >
      <View
        style={[
          styles.blobTop,
          { backgroundColor: isDark ? 'rgba(110,220,140,0.14)' : 'rgba(110,220,140,0.2)' },
        ]}
      />
      <View
        style={[
          styles.blobBottom,
          { backgroundColor: isDark ? 'rgba(42,157,115,0.2)' : 'rgba(62,207,142,0.18)' },
        ]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blobTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -120,
    right: -100,
  },
  blobBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: -150,
    left: -130,
  },
});
