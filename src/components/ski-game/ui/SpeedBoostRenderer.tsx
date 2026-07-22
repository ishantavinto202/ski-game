import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { speedBoostWorldToScreenRect } from '../entities/SpeedBoost';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SPEED_BOOST_WORLD_SIZE } from '../types/SpeedBoostTypes';
import { getSpeedBoostRenderMargin, isSpeedBoostRectVisible } from '../utils/speed-boost-render';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.speedBoostPlaceholder,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.speedBoostPlaceholderBorder,
    borderRadius: 8,
  },
});

const SPEED_BOOST_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_SPEED_BOOSTS; index += 1) {
  SPEED_BOOST_SLOT_INDICES.push(index);
}

type SpeedBoostRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const SpeedBoostRenderSlot = memo(function SpeedBoostRenderSlot({
  slotIndex,
  viewport,
}: SpeedBoostRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue<number>(SPEED_BOOST_WORLD_SIZE.width);
  const height = useSharedValue<number>(SPEED_BOOST_WORLD_SIZE.height);
  const opacity = useSharedValue(0);

  const bodyStyle = useMemo(() => layerStyle.body, []);

  useEffect(() => {
    const margin = getSpeedBoostRenderMargin();

    return engine.onFrame(() => {
      const speedBoost = engine.speedBoostRef.current.speedBoosts[slotIndex];
      if (!speedBoost.active) {
        opacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = speedBoostWorldToScreenRect(speedBoost, scrollOffsetY, cameraOffsetX);

      if (!isSpeedBoostRectVisible(rect, viewport, margin)) {
        opacity.value = 0;
        return;
      }

      left.value = rect.left;
      top.value = rect.top;
      width.value = rect.width;
      height.value = rect.height;
      opacity.value = 1;
    });
  }, [engine, height, left, opacity, slotIndex, top, viewport, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[bodyStyle, animatedStyle]} pointerEvents="none" />;
});

type SpeedBoostRendererProps = {
  viewport: ViewportSize;
};

export const SpeedBoostRenderer = memo(function SpeedBoostRenderer({
  viewport,
}: SpeedBoostRendererProps) {
  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SPEED_BOOST_SLOT_INDICES.map((slotIndex) => (
        <SpeedBoostRenderSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
