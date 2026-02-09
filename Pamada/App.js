/**
 * App.js - Root Application Component
 * 
 * Expo React Native app with optimizations:
 * - Font loading with fallback to system fonts
 * - Efficient splash screen handling
 * - Proper provider hierarchy for performance
 * - Safe area, auth, navigation, theming support
 */

import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import RootNavigator from './src/navigation/RootNavigator';
import RootLayout from './src/layout/RootLayout';
import { colors } from './src/theme';


// Suppress non-critical warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

export default function App() {
  // Lock orientation once
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppDataProvider>
          <NavigationContainer
            theme={{
              dark: false,
              colors: {
                primary: colors.primary,
                background: colors.background,
                card: colors.white,
                text: colors.text.primary,
                border: colors.border,
                notification: colors.error,
              },
            }}
          >
            <RootLayout>
              <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.white}
                translucent={false}
              />

              <RootNavigator />
            </RootLayout>
          </NavigationContainer>
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
