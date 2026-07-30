import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';
import { SKI_GAME_COLORS } from '../utils/colors';
import { writeSharedNumber } from '../utils/shared-value-write';

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

const MAX_TREES = GAME_CONFIG.MAX_DECORATIVE_TREES;

const TREE_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_TREES; index += 1) {
  TREE_SLOT_INDICES.push(index);
}

type TreeSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
};

function createTreeSlotShared(): TreeSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    width: makeMutable(0),
    height: makeMutable(0),
    opacity: makeMutable(0),
  };
}

type EdgeTreeSlotProps = {
  shared: TreeSlotShared;
};

const EdgeTreeRenderSlot = memo(function EdgeTreeRenderSlot({ shared }: EdgeTreeSlotProps) {
  const bodyStyle = useMemo(() => layerStyle.body, []);

  const animatedStyle = useAnimatedStyle(() => ({
    left: shared.left.value,
    top: shared.top.value,
    width: shared.width.value,
    height: shared.height.value,
    opacity: shared.opacity.value,
  }));
  const compositeStyle = useMemo(
    () => [bodyStyle, animatedStyle],
    [animatedStyle, bodyStyle],
  );

  return <Animated.View style={compositeStyle} pointerEvents="none" />;
});

type EdgeTreeRendererProps = {
  viewport: ViewportSize;
};

export const EdgeTreeRenderer = memo(function EdgeTreeRenderer({ viewport }: EdgeTreeRendererProps) {
  const engine = useGameEngineContext();

  const slots = useMemo(() => {
    const list: TreeSlotShared[] = new Array(MAX_TREES);
    for (let index = 0; index < MAX_TREES; index += 1) {
      list[index] = createTreeSlotShared();
    }
    return list;
  }, []);
  const lastWorldXRef = useRef(new Float64Array(MAX_TREES).fill(Number.NaN));
  const lastWorldYRef = useRef(new Float64Array(MAX_TREES).fill(Number.NaN));
  const lastWidthRef = useRef(new Float64Array(MAX_TREES).fill(Number.NaN));
  const lastHeightRef = useRef(new Float64Array(MAX_TREES).fill(Number.NaN));
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  useEffect(() => {
    if (!GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
      return;
    }

    const margin = GAME_CONFIG.DECORATIVE_TREE_DESPAWN_MARGIN;
    const lastWorldX = lastWorldXRef.current;
    const lastWorldY = lastWorldYRef.current;
    const lastWidth = lastWidthRef.current;
    const lastHeight = lastHeightRef.current;

    return engine.onPlayingFrame(() => {
      const trees = engine.decorativeTreeRef.current.trees;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);

      for (let slotIndex = 0; slotIndex < MAX_TREES; slotIndex += 1) {
        const slot = slots[slotIndex];
        const tree = trees[slotIndex];

        if (!tree.active) {
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const localLeft = tree.worldX - tree.width * 0.5;
        const localTop = -tree.worldY - tree.height * 0.5;
        const screenLeft = localLeft - nextCameraOffsetX;
        const screenTop = localTop + nextScrollOffsetY;

        if (
          screenLeft + tree.width < -margin ||
          screenLeft > viewportWidth + margin ||
          screenTop + tree.height < -margin ||
          screenTop > viewportHeight + margin
        ) {
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        if (
          lastWorldX[slotIndex] !== tree.worldX ||
          lastWorldY[slotIndex] !== tree.worldY ||
          lastWidth[slotIndex] !== tree.width ||
          lastHeight[slotIndex] !== tree.height
        ) {
          lastWorldX[slotIndex] = tree.worldX;
          lastWorldY[slotIndex] = tree.worldY;
          lastWidth[slotIndex] = tree.width;
          lastHeight[slotIndex] = tree.height;
          writeSharedNumber(slot.left, localLeft);
          writeSharedNumber(slot.top, localTop);
          writeSharedNumber(slot.width, tree.width);
          writeSharedNumber(slot.height, tree.height);
        }
        writeSharedNumber(slot.opacity, 0.85);
      }
    });
  }, [
    cameraOffsetX,
    engine,
    scrollOffsetY,
    slots,
    viewport.height,
    viewport.width,
  ]);

  const layerTransformStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: -cameraOffsetX.value },
      { translateY: scrollOffsetY.value },
    ] as ViewStyle['transform'],
  }));
  const animatedLayerStyle = useMemo(
    () => [layerStyle.root, layerTransformStyle],
    [layerTransformStyle],
  );

  const renderSlot = useCallback(
    (slotIndex: number) => (
      <EdgeTreeRenderSlot key={slotIndex} shared={slots[slotIndex]} />
    ),
    [slots],
  );
  const slotElements = useMemo(
    () => TREE_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  if (!GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
    return null;
  }

  return (
    <Animated.View style={animatedLayerStyle} pointerEvents="none">
      {slotElements}
    </Animated.View>
  );
});
