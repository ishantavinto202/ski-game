import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useGameEngineContext } from '../engine/GameEngineContext';
import type { ViewportSize } from '../engine/GameEngine';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

const worldLayerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  cameraLayer: {
    flex: 1,
  },
  strip: {
    position: 'absolute',
    top: 0,
  },
  tile: {
    backgroundColor: SKI_GAME_COLORS.snow,
  },
});

type WorldRendererProps = {
  viewport: ViewportSize;
};

export const WorldRenderer = memo(function WorldRenderer({ viewport }: WorldRendererProps) {
  const engine = useGameEngineContext();
  const scrollY = useSharedValue(0);
  const cameraOffsetX = useSharedValue(0);

  const cameraMargin = GAME_CONFIG.CAMERA_MAX_OFFSET;
  const worldWidth = viewport.width + cameraMargin * 2;
  const stripHeight = viewport.height * 2;

  const stripLayoutStyle = useMemo(
    () => [
      worldLayerStyle.strip,
      {
        left: -cameraMargin,
        width: worldWidth,
        height: stripHeight,
      },
    ],
    [cameraMargin, stripHeight, worldWidth],
  );

  const tileStyle = useMemo(
    () => [worldLayerStyle.tile, { width: worldWidth, height: viewport.height }],
    [viewport.height, worldWidth],
  );

  useEffect(() => {
    return engine.onFrame(() => {
      scrollY.value = engine.worldRef.current.scrollOffsetY;
      cameraOffsetX.value = engine.cameraRef.current.offsetX;
    });
  }, [cameraOffsetX, engine, scrollY]);

  const animatedCameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -cameraOffsetX.value }],
  }));

  const animatedScrollStyle = useAnimatedStyle(() => {
    const loopHeight = viewport.height;
    const wrappedOffset = loopHeight > 0 ? scrollY.value % loopHeight : 0;
    return {
      transform: [{ translateY: -wrappedOffset }],
    };
  }, [viewport.height]);

  return (
    <View style={worldLayerStyle.root} pointerEvents="none">
      <Animated.View style={[worldLayerStyle.cameraLayer, animatedCameraStyle]}>
        <Animated.View style={[stripLayoutStyle, animatedScrollStyle]}>
          <View style={tileStyle} />
          <View style={tileStyle} />
        </Animated.View>
      </Animated.View>
    </View>
  );
});
