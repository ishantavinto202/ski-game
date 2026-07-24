import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { OBSTACLE_VARIANT_RENDER_INDEX } from '../utils/obstacle-variant-index';
import {
  hasObstacleAsset,
  OBSTACLE_RENDER_ASSET_SOURCES,
  resolveObstacleRenderAssetIndex,
  resolvePrecomputedObstacleCollisionLayout,
  resolvePrecomputedObstacleVisualLayout,
} from '../utils/obstacle-assets';
import {
  getObstacleRenderMargin,
  isObstacleRectVisible,
  obstacleWorldToScreenRect,
} from '../utils/obstacle-render';
import { OBSTACLE_VARIANT_PLACEHOLDER_COLORS, SKI_GAME_COLORS } from '../utils/colors';
import { logCabinRenderedOnce } from '../utils/cabin-debug';
import { GAME_CONFIG } from '../utils/GameConfig';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const DEBUG_OBSTACLE_HITBOXES = GAME_CONFIG.DEBUG_OBSTACLE_HITBOXES;

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.obstaclePlaceholderBorder,
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
for (let index = 0; index < GAME_CONFIG.MAX_OBSTACLES; index += 1) {
  OBSTACLE_SLOT_INDICES.push(index);
}

type ObstacleAssetImageLayerProps = {
  assetIndex: number;
  source: number;
  activeAssetIndex: SharedValue<number>;
  opacity: SharedValue<number>;
  assetLeft: SharedValue<number>;
  assetTop: SharedValue<number>;
  assetWidth: SharedValue<number>;
  assetHeight: SharedValue<number>;
  imageStyle: { position: 'absolute' };
};

const ObstacleAssetImageLayer = memo(function ObstacleAssetImageLayer({
  assetIndex,
  source,
  activeAssetIndex,
  opacity,
  assetLeft,
  assetTop,
  assetWidth,
  assetHeight,
  imageStyle,
}: ObstacleAssetImageLayerProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    left: assetLeft.value,
    top: assetTop.value,
    width: assetWidth.value,
    height: assetHeight.value,
    opacity: opacity.value > 0 && activeAssetIndex.value === assetIndex ? opacity.value : 0,
  }));

  return (
    <AnimatedImage source={source} resizeMode="contain" style={[imageStyle, animatedStyle]} />
  );
});

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
  const usesAsset = useSharedValue(0);
  const activeAssetIndex = useSharedValue(-1);
  const assetLeft = useSharedValue(0);
  const assetTop = useSharedValue(0);
  const assetWidth = useSharedValue(0);
  const assetHeight = useSharedValue(0);
  const hitboxLeft = useSharedValue(0);
  const hitboxTop = useSharedValue(0);
  const hitboxWidth = useSharedValue(0);
  const hitboxHeight = useSharedValue(0);
  const hitboxOpacity = useSharedValue(0);

  const placeholderStyle = useMemo(() => layerStyle.placeholder, []);
  const assetImageStyle = useMemo(() => layerStyle.assetImage, []);
  const hitboxDebugStyle = useMemo(() => layerStyle.hitboxDebug, []);

  useEffect(() => {
    const margin = getObstacleRenderMargin();

    return engine.onFrame(() => {
      const obstacle = engine.obstacleRef.current.obstacles[slotIndex];
      if (!obstacle.active) {
        opacity.value = 0;
        usesAsset.value = 0;
        activeAssetIndex.value = -1;
        hitboxOpacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = obstacleWorldToScreenRect(obstacle, scrollOffsetY, cameraOffsetX);

      if (!isObstacleRectVisible(rect, viewport, margin)) {
        opacity.value = 0;
        usesAsset.value = 0;
        activeAssetIndex.value = -1;
        hitboxOpacity.value = 0;
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
          activeAssetIndex.value = assetIndex;
          usesAsset.value = 1;
          assetLeft.value = rect.left + layout.visualOffsetX;
          assetTop.value = rect.top + layout.visualOffsetY;
          assetWidth.value = layout.renderWidth;
          assetHeight.value = layout.renderHeight;
        } else {
          activeAssetIndex.value = -1;
          usesAsset.value = 0;
        }
      } else {
        activeAssetIndex.value = -1;
        usesAsset.value = 0;
      }

      if (DEBUG_OBSTACLE_HITBOXES) {
        const collisionLayout = resolvePrecomputedObstacleCollisionLayout(
          obstacle.variant,
          obstacle.treeVisualVariant,
        );
        if (collisionLayout) {
          hitboxLeft.value = rect.left + collisionLayout.offsetX;
          hitboxTop.value = rect.top + collisionLayout.offsetY;
          hitboxWidth.value = collisionLayout.width;
          hitboxHeight.value = collisionLayout.height;
          hitboxOpacity.value = 1;
        } else {
          hitboxOpacity.value = 0;
        }
      } else {
        hitboxOpacity.value = 0;
      }

      opacity.value = 1;
    });
  }, [
    activeAssetIndex,
    assetHeight,
    assetLeft,
    assetTop,
    assetWidth,
    engine,
    height,
    hitboxHeight,
    hitboxLeft,
    hitboxOpacity,
    hitboxTop,
    hitboxWidth,
    left,
    opacity,
    slotIndex,
    top,
    usesAsset,
    variantIndex,
    viewport,
    width,
  ]);

  const placeholderAnimatedStyle = useAnimatedStyle(() => {
    const colors = OBSTACLE_VARIANT_PLACEHOLDER_COLORS;
    const fillIndex = variantIndex.value;
    const backgroundColor =
      fillIndex >= 0 && fillIndex < colors.length ? colors[fillIndex] : colors[0];
    const showPlaceholder = opacity.value > 0 && usesAsset.value === 0;

    return {
      left: left.value,
      top: top.value,
      width: width.value,
      height: height.value,
      opacity: showPlaceholder ? opacity.value : 0,
      backgroundColor,
      borderRadius: width.value > 48 ? 8 : 6,
    };
  });

  const hitboxDebugAnimatedStyle = useAnimatedStyle(() => ({
    left: hitboxLeft.value,
    top: hitboxTop.value,
    width: hitboxWidth.value,
    height: hitboxHeight.value,
    opacity: opacity.value > 0 ? hitboxOpacity.value : 0,
  }));

  return (
    <>
      <Animated.View style={[placeholderStyle, placeholderAnimatedStyle]} pointerEvents="none" />
      {OBSTACLE_RENDER_ASSET_SOURCES.map((source, assetIndex) => (
        <ObstacleAssetImageLayer
          key={assetIndex}
          assetIndex={assetIndex}
          source={source}
          activeAssetIndex={activeAssetIndex}
          opacity={opacity}
          assetLeft={assetLeft}
          assetTop={assetTop}
          assetWidth={assetWidth}
          assetHeight={assetHeight}
          imageStyle={assetImageStyle}
        />
      ))}
      {DEBUG_OBSTACLE_HITBOXES ? (
        <Animated.View
          style={[hitboxDebugStyle, hitboxDebugAnimatedStyle]}
          pointerEvents="none"
        />
      ) : null}
    </>
  );
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
