import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAppTheme from '../theme/useAppTheme';

export default function RootLayout({ children }) {
  const { palette, isDark } = useAppTheme();

  return (
    <LinearGradient
      colors={[palette.background.base, '#E9F3EC', palette.background.secondary]}
      style={styles.container}
    >
      <View
        style={[
          styles.blobTop,
          { backgroundColor: isDark ? 'rgba(117, 196, 139, 0.15)' : 'rgba(157, 220, 173, 0.32)' },
        ]}
      />
      <View
        style={[
          styles.blobBottom,
          { backgroundColor: isDark ? 'rgba(63, 132, 87, 0.22)' : 'rgba(133, 195, 149, 0.24)' },
        ]}
      />
      <View
        style={[
          styles.blobCenter,
          { backgroundColor: isDark ? 'rgba(129, 191, 147, 0.08)' : 'rgba(195, 234, 207, 0.35)' },
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
  blobCenter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: '34%',
    right: -90,
  },
});
