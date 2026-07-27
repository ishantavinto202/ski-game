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
  isPickupVerticalSeparationBlocked,
  isSpawnAreaOccupied,
  type PickupSpawnKind,
  type SpawnFootprint,
} from './spawn-validation';
export {
  obstacleWorldToScreenRect,
  isObstacleRectVisible,
  getObstacleRenderMargin,
} from './obstacle-render';
export { getObstacleCollisionScreenRect } from './obstacle-collision';
export {
  hasObstacleClearance,
  hasObstaclePassageClearance,
  isObstacleSpawnSpacingValid,
  resolveMinimumHorizontalPassableGap,
  resolveMinimumVerticalPassableGap,
  resolveObstaclePairClearance,
} from './obstacle-spacing';
export {
  cabinAsset,
  treeStumpAsset,
  largeBoulderAsset,
  smallRockAsset,
  woodenFenceAsset,
  treeVisualAssets,
  CABIN_ASSET_METADATA,
  TREE_STUMP_ASSET_METADATA,
  LARGE_BOULDER_ASSET_METADATA,
  SMALL_ROCK_ASSET_METADATA,
  WOODEN_FENCE_ASSET_METADATA,
  SMALL_ROCK_COLLISION,
  LARGE_BOULDER_COLLISION,
  TREE_STUMP_COLLISION,
  CABIN_COLLISION,
  WOODEN_FENCE_COLLISION,
  TREE_VISUAL_COLLISIONS,
  CABIN_VISUAL_LAYOUT,
  SMALL_ROCK_VISUAL_LAYOUT,
  LARGE_BOULDER_VISUAL_LAYOUT,
  TREE_STUMP_VISUAL_LAYOUT,
  WOODEN_FENCE_VISUAL_LAYOUT,
  SMALL_ROCK_COLLISION_LAYOUT,
  LARGE_BOULDER_COLLISION_LAYOUT,
  TREE_STUMP_COLLISION_LAYOUT,
  CABIN_COLLISION_LAYOUT,
  WOODEN_FENCE_COLLISION_LAYOUT,
  TREE_COLLISION_LAYOUTS,
  TREE_VISUAL_ASSETS,
  TREE_VISUAL_LAYOUTS,
  TREE_VISUAL_VARIANT_COUNT,
  OBSTACLE_VARIANT_ASSETS,
  OBSTACLE_RENDER_ASSET_SOURCES,
  OBSTACLE_RENDER_ASSET_INDEX,
  hasObstacleAsset,
  resolveObstacleRenderAssetIndex,
  resolveObstacleAssetVisualLayout,
  resolvePrecomputedObstacleVisualLayout,
  resolvePrecomputedObstacleCollisionLayout,
  type ObstacleVisualAsset,
  type ObstacleAssetMetadata,
  type ObstacleCollisionMetadata,
  type ObstacleVisualLayout,
  type ObstacleCollisionLayout,
  type ObstacleVariantAssetConfig,
} from './obstacle-assets';
export {
  SNOW_SURFACE_ASSETS,
  SNOW_SURFACE_ASSET_COUNT,
  SNOW_SURFACE_SPAWN_WEIGHT_TOTAL,
  resolveSnowSurfaceBaseHeight,
  type SnowSurfaceAssetDef,
} from './snow-surface-assets';
export { OBSTACLE_VARIANT_RENDER_INDEX } from './obstacle-variant-index';
export { aabbIntersectsWithPadding } from './collision';
export { isCoinRectVisible, getCoinRenderMargin } from './coin-render';
export {
  PLAYER_ATLAS,
  PLAYER_ATLAS_TEXTURE,
  CHASER_ATLAS_TEXTURE,
  PLAYER_SPRITE_FRAME_COUNT,
  PLAYER_SPRITE_SOURCE_WIDTH,
  PLAYER_SPRITE_SOURCE_HEIGHT,
} from './player-sprite';
