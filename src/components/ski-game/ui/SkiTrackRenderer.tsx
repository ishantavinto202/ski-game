import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import {
  getSkiTrackSegmentSlotIndices,
  getSkiTrackState,
  isSkiTrackSegmentVisible,
  readSkiTrackSegmentLayout,
  syncSkiTrackRendererFrame,
} from '../effects/SkiTrack';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

const SEGMENT_SLOT_INDICES = getSkiTrackSegmentSlotIndices();

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  stroke: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.skiTrackStroke,
  },
});

const trackWidthStyle = {
  height: GAME_CONFIG.SKI_TRACK_WIDTH,
  borderRadius: GAME_CONFIG.SKI_TRACK_WIDTH * 0.5,
};

type SkiTrackStrokeProps = {
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  length: SharedValue<number>;
  angleDeg: SharedValue<number>;
  opacity: SharedValue<number>;
  strokeStyle: { position: 'absolute'; backgroundColor: string };
};

const SkiTrackStroke = memo(function SkiTrackStroke({
  centerX,
  centerY,
  length,
  angleDeg,
  opacity,
  strokeStyle,
}: SkiTrackStrokeProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const segmentLength = length.value;
    const trackWidth = GAME_CONFIG.SKI_TRACK_WIDTH;
    return {
      left: centerX.value - segmentLength * 0.5,
      top: centerY.value - trackWidth * 0.5,
      width: segmentLength,
      opacity: opacity.value,
      transform: [{ rotate: `${angleDeg.value}deg` }],
    };
  });

  return <Animated.View style={[strokeStyle, trackWidthStyle, animatedStyle]} pointerEvents="none" />;
});

type SkiTrackSegmentSlotProps = {
  segmentIndex: number;
  viewport: ViewportSize;
};

const SkiTrackSegmentSlot = memo(function SkiTrackSegmentSlot({
  segmentIndex,
  viewport,
}: SkiTrackSegmentSlotProps) {
  const engine = useGameEngineContext();
  const leftCenterX = useSharedValue(0);
  const leftCenterY = useSharedValue(0);
  const rightCenterX = useSharedValue(0);
  const rightCenterY = useSharedValue(0);
  const length = useSharedValue(0);
  const angleDeg = useSharedValue(0);
  const opacity = useSharedValue(0);

  const strokeStyle = useMemo(() => layerStyle.stroke, []);

  useEffect(() => {
    return engine.onFrame(() => {
      const state = getSkiTrackState(engine);
      if (segmentIndex >= state.activeSegmentCount) {
        opacity.value = 0;
        return;
      }

      const layout = readSkiTrackSegmentLayout(state, segmentIndex);
      length.value = layout.length;
      angleDeg.value = layout.angleDeg;

      const segmentVisible =
        isSkiTrackSegmentVisible(
          layout.leftCenterX,
          layout.leftCenterY,
          layout.length,
          viewport.width,
          viewport.height,
        ) ||
        isSkiTrackSegmentVisible(
          layout.rightCenterX,
          layout.rightCenterY,
          layout.length,
          viewport.width,
          viewport.height,
        );

      if (!segmentVisible) {
        opacity.value = 0;
        return;
      }

      opacity.value = layout.opacity;
      leftCenterX.value = layout.leftCenterX;
      leftCenterY.value = layout.leftCenterY;
      rightCenterX.value = layout.rightCenterX;
      rightCenterY.value = layout.rightCenterY;
    });
  }, [
    angleDeg,
    engine,
    leftCenterX,
    leftCenterY,
    length,
    opacity,
    rightCenterX,
    rightCenterY,
    segmentIndex,
    viewport.height,
    viewport.width,
  ]);

  return (
    <>
      <SkiTrackStroke
        centerX={leftCenterX}
        centerY={leftCenterY}
        length={length}
        angleDeg={angleDeg}
        opacity={opacity}
        strokeStyle={strokeStyle}
      />
      <SkiTrackStroke
        centerX={rightCenterX}
        centerY={rightCenterY}
        length={length}
        angleDeg={angleDeg}
        opacity={opacity}
        strokeStyle={strokeStyle}
      />
    </>
  );
});

type SkiTrackRendererProps = {
  viewport: ViewportSize;
};

export const SkiTrackRenderer = memo(function SkiTrackRenderer({ viewport }: SkiTrackRendererProps) {
  const engine = useGameEngineContext();

  useEffect(() => {
    return engine.onFrame(() => {
      syncSkiTrackRendererFrame(engine, viewport);
    });
  }, [engine, viewport]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SEGMENT_SLOT_INDICES.map((segmentIndex) => (
        <SkiTrackSegmentSlot key={segmentIndex} segmentIndex={segmentIndex} viewport={viewport} />
      ))}
    </View>
  );
});
