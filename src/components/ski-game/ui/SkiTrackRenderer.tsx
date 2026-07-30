import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, type PathProps } from 'react-native-svg';

import {
  getChaserSkiTrackState,
  getSkiTrackState,
  syncSkiTrackRendererFrame,
} from '../effects/SkiTrack';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import type { SkiTrackState } from '../types/SkiTrackTypes';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';
import { writeSharedNumber } from '../utils/shared-value-write';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Twelve fade bands preserve the authored near/far trail gradient while reducing
 * 188 permanently mounted rotated Views to twelve SVG paths.
 */
const PATH_BAND_COUNT = 12;
const PATH_BAND_INDICES: number[] = [];
for (let index = 0; index < PATH_BAND_COUNT; index += 1) {
  PATH_BAND_INDICES.push(index);
}

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});

function resolveBandOpacity(bandIndex: number): number {
  const progress =
    PATH_BAND_COUNT > 1 ? bandIndex / (PATH_BAND_COUNT - 1) : 1;
  return (
    GAME_CONFIG.SKI_TRACK_OPACITY_FAR +
    (GAME_CONFIG.SKI_TRACK_OPACITY - GAME_CONFIG.SKI_TRACK_OPACITY_FAR) *
      progress
  );
}

function quantizeCoordinate(value: number): number {
  return Math.round(value * 10) * 0.1;
}

function appendRailSegment(
  currentPath: string,
  centerX: number,
  centerY: number,
  halfLength: number,
  directionX: number,
  directionY: number,
  cameraOffsetX: number,
  scrollOffsetY: number,
): string {
  const startX = quantizeCoordinate(
    centerX - directionX * halfLength - cameraOffsetX,
  );
  const startY = quantizeCoordinate(
    centerY - directionY * halfLength + scrollOffsetY,
  );
  const endX = quantizeCoordinate(
    centerX + directionX * halfLength - cameraOffsetX,
  );
  const endY = quantizeCoordinate(
    centerY + directionY * halfLength + scrollOffsetY,
  );
  return `${currentPath}M${startX},${startY}L${endX},${endY}`;
}

function appendTrackToBands(
  state: SkiTrackState,
  pathBands: string[],
  cameraOffsetX: number,
  scrollOffsetY: number,
): void {
  const opacityRange =
    GAME_CONFIG.SKI_TRACK_OPACITY - GAME_CONFIG.SKI_TRACK_OPACITY_FAR;

  for (
    let segmentIndex = 0;
    segmentIndex < state.activeSegmentCount;
    segmentIndex += 1
  ) {
    const normalizedOpacity =
      opacityRange > 0
        ? (state.segOpacity[segmentIndex] -
            GAME_CONFIG.SKI_TRACK_OPACITY_FAR) /
          opacityRange
        : 1;
    const unclampedBand = Math.round(
      normalizedOpacity * (PATH_BAND_COUNT - 1),
    );
    const bandIndex =
      unclampedBand < 0
        ? 0
        : unclampedBand >= PATH_BAND_COUNT
          ? PATH_BAND_COUNT - 1
          : unclampedBand;
    const angleRadians = state.segAngleDeg[segmentIndex] * (Math.PI / 180);
    const directionX = Math.cos(angleRadians);
    const directionY = Math.sin(angleRadians);
    const halfLength = state.segLength[segmentIndex] * 0.5;

    let bandPath = pathBands[bandIndex];
    bandPath = appendRailSegment(
      bandPath,
      state.segLeftCenterX[segmentIndex],
      state.segLeftCenterY[segmentIndex],
      halfLength,
      directionX,
      directionY,
      cameraOffsetX,
      scrollOffsetY,
    );
    pathBands[bandIndex] = appendRailSegment(
      bandPath,
      state.segRightCenterX[segmentIndex],
      state.segRightCenterY[segmentIndex],
      halfLength,
      directionX,
      directionY,
      cameraOffsetX,
      scrollOffsetY,
    );
  }
}

type SkiTrackPathProps = {
  pathData: SharedValue<string>;
  opacity: number;
};

const SkiTrackPath = memo(function SkiTrackPath({
  pathData,
  opacity,
}: SkiTrackPathProps) {
  const animatedProps = useAnimatedProps<PathProps>(() => ({
    d: pathData.value,
  }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="none"
      stroke={SKI_GAME_COLORS.skiTrackStroke}
      strokeWidth={GAME_CONFIG.SKI_TRACK_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
});

type SkiTrackRendererProps = {
  viewport: ViewportSize;
};

export const SkiTrackRenderer = memo(function SkiTrackRenderer({
  viewport,
}: SkiTrackRendererProps) {
  const engine = useGameEngineContext();
  const currentCameraOffsetX = useSharedValue(0);
  const currentScrollOffsetY = useSharedValue(0);
  const pathAnchorCameraOffsetX = useSharedValue(0);
  const pathAnchorScrollOffsetY = useSharedValue(0);
  const lastPlayerRevisionRef = useRef(-1);
  const lastChaserRevisionRef = useRef(-1);
  const lastPathSyncMsRef = useRef(Number.NEGATIVE_INFINITY);
  const pathScratchRef = useRef<string[]>(
    new Array(PATH_BAND_COUNT).fill(''),
  );
  const pathBands = useMemo(() => {
    const values: SharedValue<string>[] = new Array(PATH_BAND_COUNT);
    for (let index = 0; index < PATH_BAND_COUNT; index += 1) {
      values[index] = makeMutable('');
    }
    return values;
  }, []);

  useEffect(() => {
    return engine.onPlayingFrame(() => {
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      writeSharedNumber(currentCameraOffsetX, nextCameraOffsetX);
      writeSharedNumber(currentScrollOffsetY, nextScrollOffsetY);

      const playerState = getSkiTrackState(engine);
      const chaserState = getChaserSkiTrackState(engine);
      const playerChanged =
        lastPlayerRevisionRef.current !== playerState.layoutRevision;
      const chaserChanged =
        lastChaserRevisionRef.current !== chaserState.layoutRevision;
      if (!playerChanged && !chaserChanged) {
        return;
      }
      const elapsedMs = engine.timeRef.current.elapsedMs;
      const lastPathSyncMs = lastPathSyncMsRef.current;
      if (
        elapsedMs >= lastPathSyncMs &&
        elapsedMs - lastPathSyncMs <
        GAME_CONFIG.SKI_TRACK_PATH_SYNC_INTERVAL_MS
      ) {
        return;
      }

      syncSkiTrackRendererFrame(engine, viewport);
      const scratch = pathScratchRef.current;
      for (let index = 0; index < PATH_BAND_COUNT; index += 1) {
        scratch[index] = '';
      }
      appendTrackToBands(
        playerState,
        scratch,
        nextCameraOffsetX,
        nextScrollOffsetY,
      );
      appendTrackToBands(
        chaserState,
        scratch,
        nextCameraOffsetX,
        nextScrollOffsetY,
      );
      for (let index = 0; index < PATH_BAND_COUNT; index += 1) {
        if (pathBands[index].value !== scratch[index]) {
          pathBands[index].value = scratch[index];
        }
      }

      writeSharedNumber(pathAnchorCameraOffsetX, nextCameraOffsetX);
      writeSharedNumber(pathAnchorScrollOffsetY, nextScrollOffsetY);
      lastPlayerRevisionRef.current = playerState.layoutRevision;
      lastChaserRevisionRef.current = chaserState.layoutRevision;
      lastPathSyncMsRef.current = elapsedMs;
    });
  }, [
    currentCameraOffsetX,
    currentScrollOffsetY,
    engine,
    pathAnchorCameraOffsetX,
    pathAnchorScrollOffsetY,
    pathBands,
    viewport,
  ]);

  const layerTransformStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      {
        translateX:
          pathAnchorCameraOffsetX.value - currentCameraOffsetX.value,
      },
      {
        translateY:
          currentScrollOffsetY.value - pathAnchorScrollOffsetY.value,
      },
    ] as ViewStyle['transform'],
  }));
  const animatedLayerStyle = useMemo(
    () => [layerStyle.root, layerTransformStyle],
    [layerTransformStyle],
  );
  const renderPath = useCallback(
    (bandIndex: number) => (
      <SkiTrackPath
        key={bandIndex}
        pathData={pathBands[bandIndex]}
        opacity={resolveBandOpacity(bandIndex)}
      />
    ),
    [pathBands],
  );
  const pathElements = useMemo(
    () => PATH_BAND_INDICES.map(renderPath),
    [renderPath],
  );

  return (
    <Animated.View style={animatedLayerStyle} pointerEvents="none">
      <Svg
        width={viewport.width}
        height={viewport.height}
        style={layerStyle.svg}
      >
        {pathElements}
      </Svg>
    </Animated.View>
  );
});
