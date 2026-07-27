import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { snowSurfaceWorldToScreenRect } from '../entities/SnowSurface';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  SNOW_SURFACE_ASSET_COUNT,
  SNOW_SURFACE_ASSETS,
} from '../utils/snow-surface-assets';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  assetImage: {
    position: 'absolute',
  },
});

const DETAIL_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_SNOW_SURFACE_DETAILS; index += 1) {
  DETAIL_SLOT_INDICES.push(index);
}

const ASSET_TYPE_INDICES: number[] = [];
for (let index = 0; index < SNOW_SURFACE_ASSET_COUNT; index += 1) {
  ASSET_TYPE_INDICES.push(index);
}

type SnowSurfaceAssetLayerProps = {
  typeIndex: number;
  source: number;
  activeTypeIndex: SharedValue<number>;
  opacity: SharedValue<number>;
  left: SharedValue<number>;
  top: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  imageStyle: { position: 'absolute' };
};

const SnowSurfaceAssetLayer = memo(function SnowSurfaceAssetLayer({
  typeIndex,
  source,
  activeTypeIndex,
  opacity,
  left,
  top,
  width,
  height,
  imageStyle,
}: SnowSurfaceAssetLayerProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
    opacity: activeTypeIndex.value === typeIndex ? opacity.value : 0,
  }));

  return (
    <AnimatedImage
      source={source}
      style={[imageStyle, animatedStyle]}
      resizeMode="contain"
    />
  );
});

type SnowSurfaceSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const SnowSurfaceRenderSlot = memo(function SnowSurfaceRenderSlot({
  slotIndex,
  viewport,
}: SnowSurfaceSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const activeTypeIndex = useSharedValue(0);

  const imageStyle = useMemo(() => layerStyle.assetImage, []);

  useEffect(() => {
    const margin = GAME_CONFIG.SNOW_SURFACE_RENDER_MARGIN;

    return engine.onFrame(() => {
      const detail = engine.snowSurfaceRef.current.details[slotIndex];
      if (!detail.active) {
        opacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = snowSurfaceWorldToScreenRect(detail, scrollOffsetY, cameraOffsetX);

      if (
        rect.left + rect.width < -margin ||
        rect.left > viewport.width + margin ||
        rect.top + rect.height < -margin ||
        rect.top > viewport.height + margin
      ) {
        opacity.value = 0;
        return;
      }

      left.value = rect.left;
      top.value = rect.top;
      width.value = rect.width;
      height.value = rect.height;
      activeTypeIndex.value = detail.typeIndex;
      opacity.value = GAME_CONFIG.SNOW_SURFACE_OPACITY;
    });
  }, [
    activeTypeIndex,
    engine,
    height,
    left,
    opacity,
    slotIndex,
    top,
    viewport.height,
    viewport.width,
    width,
  ]);

  return (
    <>
      {ASSET_TYPE_INDICES.map((typeIndex) => (
        <SnowSurfaceAssetLayer
          key={typeIndex}
          typeIndex={typeIndex}
          source={SNOW_SURFACE_ASSETS[typeIndex].source}
          activeTypeIndex={activeTypeIndex}
          opacity={opacity}
          left={left}
          top={top}
          width={width}
          height={height}
          imageStyle={imageStyle}
        />
      ))}
    </>
  );
});

type SnowSurfaceRendererProps = {
  viewport: ViewportSize;
};

export const SnowSurfaceRenderer = memo(function SnowSurfaceRenderer({
  viewport,
}: SnowSurfaceRendererProps) {
  return (
    <View style={layerStyle.root} pointerEvents="none">
      {DETAIL_SLOT_INDICES.map((slotIndex) => (
        <SnowSurfaceRenderSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
