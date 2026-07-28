import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';
import { SKI_GAME_COLORS } from '../utils/colors';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.decorativeEdgeTree,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SKI_GAME_COLORS.decorativeEdgeTreeBorder,
  },
});

const TREE_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_DECORATIVE_TREES; index += 1) {
  TREE_SLOT_INDICES.push(index);
}

type EdgeTreeSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const EdgeTreeRenderSlot = memo(function EdgeTreeRenderSlot({ slotIndex, viewport }: EdgeTreeSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const bodyStyle = useMemo(() => layerStyle.body, []);

  useEffect(() => {
    const margin = GAME_CONFIG.DECORATIVE_TREE_DESPAWN_MARGIN;

    return engine.onFrame(() => {
      const tree = engine.decorativeTreeRef.current.trees[slotIndex];
      if (!tree.active) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const screenCenterY = worldYCenterToScreenY(scrollOffsetY, tree.worldY);
      const rectLeft = tree.worldX - tree.width * 0.5 - cameraOffsetX;
      const rectTop = screenCenterY - tree.height * 0.5;

      if (
        rectLeft + tree.width < -margin ||
        rectLeft > viewport.width + margin ||
        rectTop + tree.height < -margin ||
        rectTop > viewport.height + margin
      ) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      left.value = rectLeft;
      top.value = rectTop;
      width.value = tree.width;
      height.value = tree.height;
      opacity.value = 0.85;
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

type EdgeTreeRendererProps = {
  viewport: ViewportSize;
};

export const EdgeTreeRenderer = memo(function EdgeTreeRenderer({ viewport }: EdgeTreeRendererProps) {
  if (!GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
    return null;
  }

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {TREE_SLOT_INDICES.map((slotIndex) => (
        <EdgeTreeRenderSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
