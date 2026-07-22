import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { OBSTACLE_VARIANT_RENDER_INDEX } from '../utils/obstacle-variant-index';
import {
  getObstacleRenderMargin,
  isObstacleRectVisible,
  obstacleWorldToScreenRect,
} from '../utils/obstacle-render';
import { OBSTACLE_VARIANT_PLACEHOLDER_COLORS, SKI_GAME_COLORS } from '../utils/colors';
import { logCabinRenderedOnce } from '../utils/cabin-debug';
import { GAME_CONFIG } from '../utils/GameConfig';

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.obstaclePlaceholderBorder,
  },
});

const OBSTACLE_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_OBSTACLES; index += 1) {
  OBSTACLE_SLOT_INDICES.push(index);
}

type ObstacleRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const ObstacleRenderSlot = memo(function ObstacleRenderSlot({
  slotIndex,
  viewport,
}: ObstacleRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const variantIndex = useSharedValue(0);

  const borderStyle = useMemo(() => layerStyle.body, []);

  useEffect(() => {
    const margin = getObstacleRenderMargin();

    return engine.onFrame(() => {
      const obstacle = engine.obstacleRef.current.obstacles[slotIndex];
      if (!obstacle.active) {
        opacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = obstacleWorldToScreenRect(obstacle, scrollOffsetY, cameraOffsetX);

      if (!isObstacleRectVisible(rect, viewport, margin)) {
        opacity.value = 0;
        return;
      }

      if (obstacle.variant === 'cabin') {
        logCabinRenderedOnce(obstacle.spawnRequestId, rect.left, rect.top);
      }

      left.value = rect.left;
      top.value = rect.top;
      width.value = rect.width;
      height.value = rect.height;
      variantIndex.value = OBSTACLE_VARIANT_RENDER_INDEX[obstacle.variant];
      opacity.value = 1;
    });
  }, [engine, height, left, opacity, slotIndex, top, variantIndex, viewport, width]);

  const animatedStyle = useAnimatedStyle(() => {
    const colors = OBSTACLE_VARIANT_PLACEHOLDER_COLORS;
    const fillIndex = variantIndex.value;
    const backgroundColor =
      fillIndex >= 0 && fillIndex < colors.length ? colors[fillIndex] : colors[0];

    return {
      left: left.value,
      top: top.value,
      width: width.value,
      height: height.value,
      opacity: opacity.value,
      backgroundColor,
      borderRadius: width.value > 48 ? 8 : 6,
    };
  });

  return <Animated.View style={[borderStyle, animatedStyle]} pointerEvents="none" />;
});

type ObstacleRendererProps = {
  viewport: ViewportSize;
};

export const ObstacleRenderer = memo(function ObstacleRenderer({ viewport }: ObstacleRendererProps) {
  return (
    <View style={layerStyle.root} pointerEvents="none">
      {OBSTACLE_SLOT_INDICES.map((slotIndex) => (
        <ObstacleRenderSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
