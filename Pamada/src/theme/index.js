import { moderateScale } from './responsive';

const buildPalette = (mode = 'light') => {
  const isDark = mode === 'dark';

  return {
    mode,
    primary: {
      start: isDark ? '#4A8A63' : '#73B486',
      end: isDark ? '#356A4A' : '#4D8E66',
      solid: isDark ? '#4A8A63' : '#4D8E66',
      on: '#FFFFFF',
    },
    accent: {
      action: isDark ? '#72C882' : '#69B56E',
      on: '#FFFFFF',
    },
    background: {
      base: isDark ? '#0F1A14' : '#EEF6EF',
      secondary: isDark ? '#15231B' : '#E4F0E8',
      overlay: isDark ? 'rgba(7, 16, 12, 0.7)' : 'rgba(26, 57, 40, 0.16)',
    },
    surface: {
      light: isDark ? 'rgba(26, 40, 33, 0.96)' : '#FAFFFB',
      soft: isDark ? 'rgba(22, 34, 28, 0.95)' : '#F2FAF4',
      glass: isDark ? 'rgba(34, 52, 43, 0.65)' : 'rgba(255, 255, 255, 0.78)',
      elevated: isDark ? 'rgba(30, 45, 37, 0.98)' : '#FFFFFF',
      border: isDark ? 'rgba(126, 182, 150, 0.24)' : 'rgba(124, 171, 141, 0.28)',
      borderStrong: isDark ? 'rgba(138, 199, 164, 0.36)' : 'rgba(78, 128, 100, 0.34)',
    },
    text: {
      primary: isDark ? '#ECF8F1' : '#1E2A22',
      secondary: isDark ? '#B0C5B8' : '#5D6F63',
      tertiary: isDark ? '#8EA497' : '#7A8B80',
      inverse: '#FFFFFF',
    },
    status: {
      watering: '#60A5FA',
      warning: '#F59E0B',
      success: '#22C55E',
      danger: '#EF4444',
      info: '#38BDF8',
    },
    weather: {
      skyTop: isDark ? '#2E6E4C' : '#7DC790',
      skyBottom: isDark ? '#275B3F' : '#63A977',
      cloud: isDark ? 'rgba(245, 255, 249, 0.16)' : 'rgba(255, 255, 255, 0.8)',
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
  sectionGap: 20,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 20,
  button: 18,
  floating: 26,
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
    fontSize: 15,
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
    fontWeight: '500',
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
    shadowColor: '#274935',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  floating: {
    shadowColor: '#274935',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  modal: {
    shadowColor: '#213B2B',
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
  primaryDark: '#356A4A',
  primaryLight: '#DDF2E3',
  accent: legacyPalette.accent.action,
  forest: '#4D8E66',
  olive: '#73B486',
  wheat: '#EEF6EF',
  soil: '#5D6F63',
  mist: '#F2FAF4',
  glass: legacyPalette.surface.glass,
  overlay: legacyPalette.background.overlay,
  gradientTop: legacyPalette.background.base,
  gradientMid: legacyPalette.background.secondary,
  gradientBottom: '#D9EEDD',
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
