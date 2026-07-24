import { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

const placeholderStyles = StyleSheet.create({
  body: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.chaserPlaceholder,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.chaserPlaceholderBorder,
  },
});

const staticBodyStyle = {
  width: GAME_CONFIG.CHASER_WIDTH,
  height: GAME_CONFIG.CHASER_HEIGHT,
};

/**
 * Placeholder chaser — gameplay positions live on engine.chaserRef.
 * No chase logic; syncs Reanimated shared values on engine.onFrame only.
 */
export const ChaserRenderer = memo(function ChaserRenderer() {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);

  const bodyStyle = useMemo(() => placeholderStyles.body, []);
  const sizeStyle = useMemo(() => staticBodyStyle, []);

  useEffect(() => {
    const chaser = engine.chaserRef.current;
    left.value = chaser.x;
    top.value = chaser.y;

    return engine.onFrame(() => {
      const live = engine.chaserRef.current;
      left.value = live.x;
      top.value = live.y;
    });
  }, [engine, left, top]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
  }));

  return (
    <Animated.View
      style={[bodyStyle, sizeStyle, animatedStyle]}
      pointerEvents="none"
    />
  );
});
