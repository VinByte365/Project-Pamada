import React, { useEffect } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import { RealtimeProvider } from './src/contexts/RealtimeContext';
import RootNavigator from './src/navigation/RootNavigator';
import RootLayout from './src/layout/RootLayout';
import { getTheme } from './src/theme';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

export default function App() {
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const palette = getTheme(mode);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RealtimeProvider>
          <AppDataProvider>
            <NavigationContainer
              theme={{
                dark: mode === 'dark',
                colors: {
                  primary: palette.primary.solid,
                  background: palette.background.base,
                  card: palette.surface.light,
                  text: palette.text.primary,
                  border: palette.surface.border,
                  notification: palette.status.warning,
                },
              }}
            >
              <RootLayout>
                <StatusBar
                  style={mode === 'dark' ? 'light' : 'dark'}
                  translucent={false}
                />
                <RootNavigator />
              </RootLayout>
            </NavigationContainer>
          </AppDataProvider>
        </RealtimeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
