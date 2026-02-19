import { useColorScheme } from 'react-native';
import { darkTheme, getTheme, lightTheme } from './index';

export default function useAppTheme() {
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'dark' : 'light';
  return {
    mode,
    isDark: mode === 'dark',
    palette: getTheme(mode),
    lightTheme,
    darkTheme,
  };
}
