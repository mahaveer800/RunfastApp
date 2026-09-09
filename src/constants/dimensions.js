import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SIZES = {
  base: 8,
  font: 14,
  radius: 12,
  padding: 16,
  width,
  height,
};