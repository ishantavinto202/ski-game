export { SKI_GAME_COLORS } from './colors';
export { GAME_CONFIG, type GameConfig } from './GameConfig';
export {
  worldYToScreenY,
  screenYToWorldY,
  worldYCenterToScreenY,
  spawnWorldYAboveViewport,
  spawnLookAheadOffsetPx,
  viewportBottomWorldY,
} from './world-coordinates';
export {
  lookAheadScreenHeightPx,
  minSafeLaneWidthPx,
  maxObstaclePatternWidthPx,
  isSteerLeftNormalizedX,
  isSteerRightNormalizedX,
  screenXToNormalized,
} from './layout-assumptions';
export { clearPendingSpawnRequests } from './spawn-requests';
export { isSpawnRequestPastDespawn, retainFailedSpawnRequest } from './spawn-request-intake';
export {
  pickWeightedSpawnPattern,
  resolvePatternLaneIndex,
  resolvePatternWorldX,
  enqueueSpawnPatternRequests,
  randomIntInclusive,
} from './spawn-patterns';
export {
  maintainSpawnPopulationAhead,
  resetSpawnPopulationState,
} from './spawn-population';
export {
  maintainDecorativeEdgeTreesAhead,
  resetEdgeTreeFillState,
} from './edge-tree-spawn';
export {
  calculatePatternFootprint,
  createDecorativeTreeFootprint,
  createPickupSpawnFootprint,
  findClearPatternOriginY,
  findClearPickupSpawn,
  footprintsOverlap,
  isPickupAreaOccupied,
  isSpawnAreaOccupied,
  type PickupSpawnKind,
  type SpawnFootprint,
} from './spawn-validation';
export {
  obstacleWorldToScreenRect,
  isObstacleRectVisible,
  getObstacleRenderMargin,
} from './obstacle-render';
export { OBSTACLE_VARIANT_RENDER_INDEX } from './obstacle-variant-index';
export { aabbIntersectsWithPadding } from './collision';
export { isCoinRectVisible, getCoinRenderMargin } from './coin-render';
