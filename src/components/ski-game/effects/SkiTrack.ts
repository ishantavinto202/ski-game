import type { GameEngine, ViewportSize } from '../engine/GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import type { SkiTrackPoint, SkiTrackState } from '../types/SkiTrackTypes';
import { GAME_CONFIG } from '../utils/GameConfig';

const MAX_SEGMENTS = GAME_CONFIG.SKI_TRACK_MAX_POINTS - 1;

type SkiTrackBundle = {
  player: SkiTrackState;
  chaser: SkiTrackState;
};

const engineStates = new WeakMap<GameEngine, SkiTrackBundle>();

const segmentSlotIndices: number[] = [];
for (let index = 0; index < MAX_SEGMENTS; index += 1) {
  segmentSlotIndices.push(index);
}

function createTrackPoint(): SkiTrackPoint {
  return { x: 0, y: 0 };
}

export function createSkiTrackState(): SkiTrackState {
  const maxPoints = GAME_CONFIG.SKI_TRACK_MAX_POINTS;
  const points: SkiTrackPoint[] = new Array(maxPoints);
  for (let index = 0; index < maxPoints; index += 1) {
    points[index] = createTrackPoint();
  }

  return {
    points,
    start: 0,
    count: 0,
    lastSampleWorldX: 0,
    lastSampleWorldY: 0,
    hasLastSample: false,
    layoutRevision: 0,
    activeSegmentCount: 0,
    segLeftCenterX: new Float64Array(MAX_SEGMENTS),
    segLeftCenterY: new Float64Array(MAX_SEGMENTS),
    segRightCenterX: new Float64Array(MAX_SEGMENTS),
    segRightCenterY: new Float64Array(MAX_SEGMENTS),
    segLength: new Float64Array(MAX_SEGMENTS),
    segAngleDeg: new Float64Array(MAX_SEGMENTS),
    segOpacity: new Float64Array(MAX_SEGMENTS),
  };
}

function getSkiTrackBundle(engine: GameEngine): SkiTrackBundle {
  let bundle = engineStates.get(engine);
  if (!bundle) {
    bundle = {
      player: createSkiTrackState(),
      chaser: createSkiTrackState(),
    };
    engineStates.set(engine, bundle);
  }
  return bundle;
}

export function getSkiTrackState(engine: GameEngine): SkiTrackState {
  return getSkiTrackBundle(engine).player;
}

export function getChaserSkiTrackState(engine: GameEngine): SkiTrackState {
  return getSkiTrackBundle(engine).chaser;
}

export function getSkiTrackSegmentSlotIndices(): readonly number[] {
  return segmentSlotIndices;
}

export function resetSkiTrackState(state: SkiTrackState): void {
  const changed = state.count !== 0 || state.hasLastSample || state.activeSegmentCount !== 0;
  state.start = 0;
  state.count = 0;
  state.hasLastSample = false;
  state.lastSampleWorldX = 0;
  state.lastSampleWorldY = 0;
  state.activeSegmentCount = 0;
  if (changed) {
    state.layoutRevision += 1;
  }
}

export function resetAllSkiTrackStates(engine: GameEngine): void {
  const bundle = getSkiTrackBundle(engine);
  resetSkiTrackState(bundle.player);
  resetSkiTrackState(bundle.chaser);
}

function pushTrackPoint(state: SkiTrackState, worldX: number, worldY: number): void {
  const maxPoints = GAME_CONFIG.SKI_TRACK_MAX_POINTS;
  if (state.count < maxPoints) {
    const index = (state.start + state.count) % maxPoints;
    state.points[index].x = worldX;
    state.points[index].y = worldY;
    state.count += 1;
    state.layoutRevision += 1;
    return;
  }

  state.start = (state.start + 1) % maxPoints;
  const writeIndex = (state.start + maxPoints - 1) % maxPoints;
  state.points[writeIndex].x = worldX;
  state.points[writeIndex].y = worldY;
  state.layoutRevision += 1;
}

function popOldestTrackPoint(state: SkiTrackState): void {
  if (state.count <= 0) {
    return;
  }
  state.start = (state.start + 1) % GAME_CONFIG.SKI_TRACK_MAX_POINTS;
  state.count -= 1;
  state.layoutRevision += 1;
}

function resolveFeetWorldPosition(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
): { worldX: number; worldY: number } {
  const centerScreenX = screenX + width * 0.5;
  const feetScreenY = screenY + height;

  return {
    worldX: centerScreenX + cameraOffsetX,
    worldY: scrollOffsetY - feetScreenY,
  };
}

function resolvePlayerFeetWorldPosition(engine: GameEngine): { worldX: number; worldY: number } | null {
  const player = engine.playerRef.current;
  if (!player) {
    return null;
  }

  return resolveFeetWorldPosition(
    player.x,
    player.y,
    player.width,
    player.height,
    engine.worldRef.current.scrollOffsetY,
    engine.cameraRef.current.offsetX,
  );
}

function resolveChaserFeetWorldPosition(engine: GameEngine): { worldX: number; worldY: number } | null {
  const player = engine.playerRef.current;
  if (!player) {
    return null;
  }

  const chaser = engine.chaserRef.current;
  return resolveFeetWorldPosition(
    chaser.x,
    chaser.y,
    GAME_CONFIG.CHASER_WIDTH,
    GAME_CONFIG.CHASER_HEIGHT,
    engine.worldRef.current.scrollOffsetY,
    engine.cameraRef.current.offsetX,
  );
}

function pruneTrackPointsBelowViewport(
  state: SkiTrackState,
  scrollOffsetY: number,
  viewportHeight: number,
): void {
  const margin = GAME_CONFIG.SKI_TRACK_RENDER_MARGIN;
  const maxPoints = GAME_CONFIG.SKI_TRACK_MAX_POINTS;

  while (state.count > 0) {
    const oldestIndex = state.start;
    const screenY = scrollOffsetY - state.points[oldestIndex].y;
    if (screenY <= viewportHeight + margin) {
      break;
    }
    popOldestTrackPoint(state);
    if (state.count === 0) {
      state.hasLastSample = false;
    } else {
      const newestIndex = (state.start + state.count - 1) % maxPoints;
      state.lastSampleWorldX = state.points[newestIndex].x;
      state.lastSampleWorldY = state.points[newestIndex].y;
    }
  }
}

function sampleSkiTrack(
  state: SkiTrackState,
  feet: { worldX: number; worldY: number },
  scrollOffsetY: number,
  viewportHeight: number | null,
): void {
  const sampleDistance = GAME_CONFIG.SKI_TRACK_SAMPLE_DISTANCE;
  const sampleDistanceSq = sampleDistance * sampleDistance;

  if (state.hasLastSample) {
    const deltaX = feet.worldX - state.lastSampleWorldX;
    const deltaY = feet.worldY - state.lastSampleWorldY;
    if (deltaX * deltaX + deltaY * deltaY < sampleDistanceSq) {
      if (viewportHeight !== null) {
        pruneTrackPointsBelowViewport(state, scrollOffsetY, viewportHeight);
      }
      return;
    }
  }

  pushTrackPoint(state, feet.worldX, feet.worldY);
  state.lastSampleWorldX = feet.worldX;
  state.lastSampleWorldY = feet.worldY;
  state.hasLastSample = true;

  if (viewportHeight !== null) {
    pruneTrackPointsBelowViewport(state, scrollOffsetY, viewportHeight);
  }
}

export function tickSkiTrackSampling(engine: GameEngine, fixedDeltaMs: number): void {
  void fixedDeltaMs;

  const bundle = getSkiTrackBundle(engine);
  if (!isGameplaySimulationActive(engine.gameStateRef.current)) {
    resetSkiTrackState(bundle.player);
    resetSkiTrackState(bundle.chaser);
    return;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const viewportHeight = engine.viewportRef.current?.height ?? null;

  const playerFeet = resolvePlayerFeetWorldPosition(engine);
  if (playerFeet) {
    sampleSkiTrack(bundle.player, playerFeet, scrollOffsetY, viewportHeight);
  }

  const chaserFeet = resolveChaserFeetWorldPosition(engine);
  if (chaserFeet) {
    sampleSkiTrack(bundle.chaser, chaserFeet, scrollOffsetY, viewportHeight);
  }
}

export function rebuildSkiTrackSegmentLayouts(
  state: SkiTrackState,
): void {
  const pointCount = state.count;
  if (pointCount < 2) {
    state.activeSegmentCount = 0;
    return;
  }

  const maxPoints = GAME_CONFIG.SKI_TRACK_MAX_POINTS;
  const halfSeparation = GAME_CONFIG.SKI_TRACK_SEPARATION * 0.5;
  const overlap = GAME_CONFIG.SKI_TRACK_SEGMENT_OVERLAP;
  const nearOpacity = GAME_CONFIG.SKI_TRACK_OPACITY;
  const farOpacity = GAME_CONFIG.SKI_TRACK_OPACITY_FAR;
  const segmentDenominator = pointCount - 2;

  let segmentIndex = 0;

  for (let pointIndex = 0; pointIndex < pointCount - 1; pointIndex += 1) {
    const index0 = (state.start + pointIndex) % maxPoints;
    const index1 = (state.start + pointIndex + 1) % maxPoints;
    const point0 = state.points[index0];
    const point1 = state.points[index1];

    // Store camera-independent local coordinates. The renderer moves the entire
    // track layer with one translateX/translateY pair every display frame.
    const screenX0 = point0.x;
    const screenY0 = -point0.y;
    const screenX1 = point1.x;
    const screenY1 = -point1.y;

    const deltaX = screenX1 - screenX0;
    const deltaY = screenY1 - screenY0;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < 0.001) {
      continue;
    }

    const inverseDistance = 1 / distance;
    const perpendicularX = -deltaY * inverseDistance;
    const perpendicularY = deltaX * inverseDistance;

    const midpointX = (screenX0 + screenX1) * 0.5;
    const midpointY = (screenY0 + screenY1) * 0.5;

    const leftCenterX = midpointX + perpendicularX * halfSeparation;
    const leftCenterY = midpointY + perpendicularY * halfSeparation;
    const rightCenterX = midpointX - perpendicularX * halfSeparation;
    const rightCenterY = midpointY - perpendicularY * halfSeparation;

    const segmentLength = distance + overlap;
    const angleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    const fadeT = segmentDenominator > 0 ? pointIndex / segmentDenominator : 1;
    const opacity = farOpacity + (nearOpacity - farOpacity) * fadeT;

    state.segLeftCenterX[segmentIndex] = leftCenterX;
    state.segLeftCenterY[segmentIndex] = leftCenterY;
    state.segRightCenterX[segmentIndex] = rightCenterX;
    state.segRightCenterY[segmentIndex] = rightCenterY;
    state.segLength[segmentIndex] = segmentLength;
    state.segAngleDeg[segmentIndex] = angleDeg;
    state.segOpacity[segmentIndex] = opacity;
    segmentIndex += 1;
  }

  state.activeSegmentCount = segmentIndex;
}

export function isSkiTrackSegmentVisible(
  centerX: number,
  centerY: number,
  segmentLength: number,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const margin = GAME_CONFIG.SKI_TRACK_RENDER_MARGIN;
  const halfLength = segmentLength * 0.5;
  const halfWidth = GAME_CONFIG.SKI_TRACK_WIDTH * 0.5;

  if (centerX + halfLength < -margin) {
    return false;
  }
  if (centerX - halfLength > viewportWidth + margin) {
    return false;
  }
  if (centerY + halfWidth < -margin) {
    return false;
  }
  if (centerY - halfWidth > viewportHeight + margin) {
    return false;
  }

  return true;
}

export function syncSkiTrackRendererFrame(engine: GameEngine, _viewport: ViewportSize): void {
  const bundle = getSkiTrackBundle(engine);
  rebuildSkiTrackSegmentLayouts(bundle.player);
  rebuildSkiTrackSegmentLayouts(bundle.chaser);
}
