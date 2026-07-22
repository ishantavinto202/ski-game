import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkiGameRoot } from '../components/SkiGameRoot';
import { SKI_GAME_COLORS } from '../utils/colors';

const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SKI_GAME_COLORS.snow,
  },
});

export const SkiGameScreen = memo(function SkiGameScreen() {
  return (
    <View style={screenStyles.root}>
      <SkiGameRoot />
    </View>
  );
});
