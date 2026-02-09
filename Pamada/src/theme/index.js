import { moderateScale } from './responsive';

export const colors = {
  primary: '#2F8F4E',
  primaryDark: '#216C3A',
  primaryLight: '#DFF5E6',
  accent: '#F59E0B',
  success: '#16A34A',
  successDark: '#15803D',
  warning: '#F59E0B',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  background: '#F6F8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F5EF',
  border: '#E3E8E0',
  borderLight: '#EEF2EC',
  text: {
    primary: '#1F2A1F',
    secondary: '#4B5A4B',
    tertiary: '#6B7B6B',
  },
  textSecondary: '#4B5A4B',
  textMuted: '#6B7B6B',
  textHint: '#9AA69A',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screenPadding: moderateScale(20),
  sectionGap: 24,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const typography = {
  display: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
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
    fontWeight: '500',
  },
};

export const textStyles = {
  caption: {
    fontSize: 12,
    fontWeight: '500',
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

export { dimensions } from './responsive';