import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;

export const scale = (size) => (width / guidelineBaseWidth) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export const isSmallDevice = width < 360;

export const dimensions = {
  width,
  height,
  isSmallDevice,
  isIOS: Platform.OS === 'ios',
};