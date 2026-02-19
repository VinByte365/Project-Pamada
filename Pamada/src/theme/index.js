import { moderateScale } from './responsive';

const buildPalette = (mode = 'light') => {
  const isDark = mode === 'dark';

  return {
    mode,
    primary: {
      start: isDark ? '#4E6953' : '#6B8A71',
      end: isDark ? '#3F5743' : '#5E7A63',
      solid: isDark ? '#4B644F' : '#5E7A63',
      on: '#FFFFFF',
    },
    accent: {
      action: '#5E7A63',
      on: '#FFFFFF',
    },
    background: {
      base: isDark ? '#121A15' : '#F2F0E6',
      secondary: isDark ? '#1A261F' : '#ECE9DE',
      overlay: isDark ? 'rgba(4, 12, 10, 0.62)' : 'rgba(12, 32, 24, 0.18)',
    },
    surface: {
      light: isDark ? 'rgba(28, 41, 36, 0.9)' : '#FFFFFF',
      soft: isDark ? 'rgba(24, 36, 32, 0.92)' : '#F4F7F6',
      glass: isDark ? 'rgba(29, 44, 39, 0.62)' : 'rgba(255, 255, 255, 0.7)',
      elevated: isDark ? 'rgba(35, 49, 44, 0.94)' : '#FFFFFF',
      border: isDark ? 'rgba(149, 195, 174, 0.2)' : 'rgba(157, 188, 174, 0.35)',
      borderStrong: isDark ? 'rgba(149, 195, 174, 0.34)' : 'rgba(115, 149, 133, 0.36)',
    },
    text: {
      primary: isDark ? '#ECF4F1' : '#1F2933',
      secondary: isDark ? '#B0C0BA' : '#6B7280',
      tertiary: isDark ? '#9BAAA4' : '#7B8794',
      inverse: isDark ? '#0B1613' : '#FFFFFF',
    },
    status: {
      watering: '#60A5FA',
      warning: '#F59E0B',
      success: '#22C55E',
      danger: '#EF4444',
      info: '#38BDF8',
    },
    weather: {
      skyTop: isDark ? '#1D3D4A' : '#8FD8FF',
      skyBottom: isDark ? '#2A5565' : '#A9E8FF',
      cloud: isDark ? 'rgba(235, 246, 255, 0.15)' : 'rgba(255, 255, 255, 0.75)',
    },
  };
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 56,
  screenPadding: moderateScale(16),
  sectionGap: 24,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  button: 16,
  floating: 24,
  pill: 999,
  xxl: 28,
};

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  titleLarge: {
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subhead: {
    fontSize: 14,
    fontWeight: '500',
  },
  subheadBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
};

export const motion = {
  buttonPress: 120,
  cardLift: 180,
  progress: 800,
  gradientLoop: 8000,
};

export const shadows = {
  surface: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 16,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
};

export const lightTheme = buildPalette('light');
export const darkTheme = buildPalette('dark');

export const getTheme = (mode = 'light') => (mode === 'dark' ? darkTheme : lightTheme);

const legacyPalette = lightTheme;

export const colors = {
  primary: legacyPalette.primary.solid,
  primaryDark: '#2A9D73',
  primaryLight: '#DFF8E8',
  accent: legacyPalette.accent.action,
  forest: '#2A9D73',
  olive: '#5DA57D',
  wheat: '#EAF7F3',
  soil: '#6B7280',
  mist: '#F4F7F6',
  glass: legacyPalette.surface.glass,
  overlay: legacyPalette.background.overlay,
  gradientTop: legacyPalette.background.base,
  gradientMid: legacyPalette.background.secondary,
  gradientBottom: '#DDF1EA',
  success: legacyPalette.status.success,
  successDark: '#15803D',
  warning: legacyPalette.status.warning,
  error: legacyPalette.status.danger,
  errorBg: '#FEE2E2',
  background: legacyPalette.background.base,
  surface: legacyPalette.surface.light,
  surfaceAlt: legacyPalette.surface.soft,
  border: legacyPalette.surface.border,
  borderLight: legacyPalette.surface.border,
  text: legacyPalette.text,
  textSecondary: legacyPalette.text.secondary,
  textMuted: legacyPalette.text.tertiary,
  textHint: legacyPalette.text.tertiary,
  white: '#FFFFFF',
  black: '#000000',
};

export const textStyles = {
  caption: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
  },
};

export { dimensions } from './responsive';
