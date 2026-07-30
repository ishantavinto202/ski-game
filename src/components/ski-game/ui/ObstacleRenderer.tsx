import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import {
  hasObstacleAsset,
  OBSTACLE_RENDER_ASSET_SOURCES,
  resolveObstacleRenderAssetIndex,
  resolvePrecomputedObstacleCollisionLayout,
  resolvePrecomputedObstacleVisualLayout,
} from '../utils/obstacle-assets';
import { getObstacleRenderMargin } from '../utils/obstacle-render';
import { logCabinRenderedOnce } from '../utils/cabin-debug';
import { GAME_CONFIG } from '../utils/GameConfig';
import { writeSharedNumber } from '../utils/shared-value-write';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const DEBUG_OBSTACLE_HITBOXES = GAME_CONFIG.DEBUG_OBSTACLE_HITBOXES;
const MAX_OBSTACLES = GAME_CONFIG.MAX_OBSTACLES;

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  assetImage: {
    position: 'absolute',
  },
  hitboxDebug: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 48, 48, 0.95)',
    backgroundColor: 'rgba(255, 48, 48, 0.18)',
  },
});

const OBSTACLE_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_OBSTACLES; index += 1) {
  OBSTACLE_SLOT_INDICES.push(index);
}

type ObstacleSlotShared = {
  opacity: SharedValue<number>;
  assetLeft: SharedValue<number>;
  assetTop: SharedValue<number>;
  assetWidth: SharedValue<number>;
  assetHeight: SharedValue<number>;
  hitboxLeft: SharedValue<number>;
  hitboxTop: SharedValue<number>;
  hitboxWidth: SharedValue<number>;
  hitboxHeight: SharedValue<number>;
  hitboxOpacity: SharedValue<number>;
};

function createObstacleSlotShared(): ObstacleSlotShared {
  return {
    opacity: makeMutable(0),
    assetLeft: makeMutable(0),
    assetTop: makeMutable(0),
    assetWidth: makeMutable(0),
    assetHeight: makeMutable(0),
    hitboxLeft: makeMutable(0),
    hitboxTop: makeMutable(0),
    hitboxWidth: makeMutable(0),
    hitboxHeight: makeMutable(0),
    hitboxOpacity: makeMutable(0),
  };
}

function hideObstacleSlot(slot: ObstacleSlotShared): void {
  if (slot.opacity.value === 0) {
    return;
  }
  slot.opacity.value = 0;
  slot.hitboxOpacity.value = 0;
}

type ObstacleHitboxDebugProps = {
  shared: ObstacleSlotShared;
};

const ObstacleHitboxDebug = memo(function ObstacleHitboxDebug({
  shared,
}: ObstacleHitboxDebugProps) {
  const hitboxDebugStyle = useMemo(() => layerStyle.hitboxDebug, []);
  const animatedStyle = useAnimatedStyle(() => ({
    left: shared.hitboxLeft.value,
    top: shared.hitboxTop.value,
    width: shared.hitboxWidth.value,
    height: shared.hitboxHeight.value,
    opacity: shared.opacity.value > 0 ? shared.hitboxOpacity.value : 0,
  }));
  const compositeStyle = useMemo(
    () => [hitboxDebugStyle, animatedStyle],
    [animatedStyle, hitboxDebugStyle],
  );

  return (
    <Animated.View
      style={compositeStyle}
      pointerEvents="none"
    />
  );
});

type ObstacleRenderSlotProps = {
  slotIndex: number;
  shared: ObstacleSlotShared;
  registerAssetSetter: (
    slotIndex: number,
    setter: ((assetIndex: number) => void) | null,
  ) => void;
};

type ObstacleAssetVisualProps = {
  assetSource: number;
  shared: ObstacleSlotShared;
};

const ObstacleAssetVisual = memo(function ObstacleAssetVisual({
  assetSource,
  shared,
}: ObstacleAssetVisualProps) {
  const assetImageStyle = useMemo(() => layerStyle.assetImage, []);
  const assetAnimatedStyle = useAnimatedStyle(() => ({
    left: shared.assetLeft.value,
    top: shared.assetTop.value,
    width: shared.assetWidth.value,
    height: shared.assetHeight.value,
    opacity: shared.opacity.value,
  }));
  const assetCompositeStyle = useMemo(
    () => [assetImageStyle, assetAnimatedStyle],
    [assetAnimatedStyle, assetImageStyle],
  );

  return (
    <>
      <AnimatedImage
        source={assetSource}
        resizeMode="contain"
        style={assetCompositeStyle}
      />
      {DEBUG_OBSTACLE_HITBOXES ? (
        <ObstacleHitboxDebug shared={shared} />
      ) : null}
    </>
  );
});

const ObstacleRenderSlot = memo(function ObstacleRenderSlot({
  slotIndex,
  shared,
  registerAssetSetter,
}: ObstacleRenderSlotProps) {
  const [assetSource, setAssetSource] = useState<number | null>(null);

  const handleAssetIndex = useCallback((assetIndex: number) => {
    setAssetSource(
      assetIndex >= 0 ? OBSTACLE_RENDER_ASSET_SOURCES[assetIndex] : null,
    );
  }, []);

  useEffect(() => {
    registerAssetSetter(slotIndex, handleAssetIndex);
    return () => {
      registerAssetSetter(slotIndex, null);
    };
  }, [handleAssetIndex, registerAssetSetter, slotIndex]);

  return assetSource !== null ? (
    <ObstacleAssetVisual assetSource={assetSource} shared={shared} />
  ) : null;
});

type ObstacleRendererProps = {
  viewport: ViewportSize;
};

export const ObstacleRenderer = memo(function ObstacleRenderer({ viewport }: ObstacleRendererProps) {
  const engine = useGameEngineContext();

  const slots = useMemo(() => {
    const list: ObstacleSlotShared[] = new Array(MAX_OBSTACLES);
    for (let index = 0; index < MAX_OBSTACLES; index += 1) {
      list[index] = createObstacleSlotShared();
    }
    return list;
  }, []);

  const assetSettersRef = useRef<(((assetIndex: number) => void) | null)[]>(
    new Array(MAX_OBSTACLES).fill(null),
  );
  const lastObstacleIdRef = useRef(new Int32Array(MAX_OBSTACLES));
  const lastAssetIndexRef = useRef(new Int16Array(MAX_OBSTACLES).fill(-1));
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  const registerAssetSetter = useCallback(
    (slotIndex: number, setter: ((assetIndex: number) => void) | null) => {
      assetSettersRef.current[slotIndex] = setter;
    },
    [],
  );

  useEffect(() => {
    const margin = getObstacleRenderMargin();
    const lastObstacleId = lastObstacleIdRef.current;
    const lastAssetIndex = lastAssetIndexRef.current;
    const releaseSlot = (slotIndex: number): void => {
      if (
        lastObstacleId[slotIndex] !== 0 ||
        lastAssetIndex[slotIndex] !== -1
      ) {
        lastObstacleId[slotIndex] = 0;
        lastAssetIndex[slotIndex] = -1;
        assetSettersRef.current[slotIndex]?.(-1);
      }
      hideObstacleSlot(slots[slotIndex]);
    };

    return engine.onPlayingFrame(() => {
      const obstacles = engine.obstacleRef.current.obstacles;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);
      let mountsRemaining =
        GAME_CONFIG.VISUAL_PRELOAD_MOUNTS_PER_RENDERER_FRAME;

      for (let slotIndex = 0; slotIndex < MAX_OBSTACLES; slotIndex += 1) {
        const slot = slots[slotIndex];
        const obstacle = obstacles[slotIndex];

        if (!obstacle.active) {
          releaseSlot(slotIndex);
          continue;
        }

        const localRectLeft = obstacle.worldX - obstacle.width * 0.5;
        const localRectTop = -obstacle.worldY - obstacle.height * 0.5;
        const screenRectLeft = localRectLeft - nextCameraOffsetX;
        const screenRectTop = localRectTop + nextScrollOffsetY;

        if (
          screenRectLeft + obstacle.width < -margin ||
          screenRectLeft > viewportWidth + margin ||
          screenRectTop + obstacle.height < -margin ||
          screenRectTop > viewportHeight + margin
        ) {
          releaseSlot(slotIndex);
          continue;
        }

        if (lastObstacleId[slotIndex] === obstacle.id) {
          writeSharedNumber(slot.opacity, 1);
          continue;
        }

        const assetIndex = resolveObstacleRenderAssetIndex(
          obstacle.variant,
          obstacle.treeVisualVariant,
        );

        if (assetIndex >= 0 && hasObstacleAsset(obstacle.variant)) {
          const layout = resolvePrecomputedObstacleVisualLayout(
            obstacle.variant,
            obstacle.treeVisualVariant,
          );
          if (layout) {
            writeSharedNumber(slot.assetLeft, localRectLeft + layout.visualOffsetX);
            writeSharedNumber(slot.assetTop, localRectTop + layout.visualOffsetY);
            writeSharedNumber(slot.assetWidth, layout.renderWidth);
            writeSharedNumber(slot.assetHeight, layout.renderHeight);
            if (lastAssetIndex[slotIndex] !== assetIndex) {
              if (mountsRemaining <= 0) {
                writeSharedNumber(slot.opacity, 0);
                continue;
              }
              const assetSetter = assetSettersRef.current[slotIndex];
              if (!assetSetter) {
                writeSharedNumber(slot.opacity, 0);
                continue;
              }
              mountsRemaining -= 1;
              lastAssetIndex[slotIndex] = assetIndex;
              assetSetter(assetIndex);
            }
          } else {
            writeSharedNumber(slot.opacity, 0);
            lastAssetIndex[slotIndex] = -1;
            continue;
          }
        } else {
          writeSharedNumber(slot.opacity, 0);
          lastAssetIndex[slotIndex] = -1;
          continue;
        }

        if (DEBUG_OBSTACLE_HITBOXES) {
          const collisionLayout = resolvePrecomputedObstacleCollisionLayout(
            obstacle.variant,
            obstacle.treeVisualVariant,
          );
          if (collisionLayout) {
            writeSharedNumber(slot.hitboxLeft, localRectLeft + collisionLayout.offsetX);
            writeSharedNumber(slot.hitboxTop, localRectTop + collisionLayout.offsetY);
            writeSharedNumber(slot.hitboxWidth, collisionLayout.width);
            writeSharedNumber(slot.hitboxHeight, collisionLayout.height);
            writeSharedNumber(slot.hitboxOpacity, 1);
          } else {
            writeSharedNumber(slot.hitboxOpacity, 0);
          }
        } else {
          writeSharedNumber(slot.hitboxOpacity, 0);
        }

        lastObstacleId[slotIndex] = obstacle.id;
        if (obstacle.variant === 'cabin') {
          logCabinRenderedOnce(
            obstacle.spawnRequestId,
            screenRectLeft,
            screenRectTop,
          );
        }
        writeSharedNumber(slot.opacity, 1);
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
      <ObstacleRenderSlot
        key={slotIndex}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        registerAssetSetter={registerAssetSetter}
      />
    ),
    [registerAssetSetter, slots],
  );
  const slotElements = useMemo(
    () => OBSTACLE_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  return (
    <Animated.View
      style={animatedLayerStyle}
      pointerEvents="none"
    >
      {slotElements}
    </Animated.View>
  );
});
