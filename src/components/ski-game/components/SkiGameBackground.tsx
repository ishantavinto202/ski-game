import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SKI_GAME_COLORS } from '../utils/colors';

const backgroundStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SKI_GAME_COLORS.snow,
  },
});

export const SkiGameBackground = memo(function SkiGameBackground() {
  return <View style={backgroundStyle.root} pointerEvents="none" />;
});
