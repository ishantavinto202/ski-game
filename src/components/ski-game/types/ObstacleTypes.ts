import { GAME_CONFIG } from '../utils/GameConfig';

export type ObstacleVariant =
  | 'small_rock'
  | 'large_boulder'
  | 'tree'
  | 'tree_stump'
  | 'cabin'
  | 'wooden_fence';

export type ObstacleDimensions = {
  width: number;
  height: number;
};

/** Render-only tree artwork index (0..2). Assigned once at activation; not a gameplay variant. */
export type TreeVisualVariant = 0 | 1 | 2;

export type ObstacleRecord = {
  id: number;
  variant: ObstacleVariant;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  active: boolean;
  spawnRequestId: number;
  laneIndex: number;
  /** Stable tree artwork index when `variant === 'tree'`; ignored for other variants. */
  treeVisualVariant: number;
};

export type ObstaclePoolState = {
  obstacles: ObstacleRecord[];
  activeCount: number;
  nextObstacleId: number;
  rngState: number;
  spawnWeightTotal: number;
};

function scaleObstacleDimensions(dimensions: ObstacleDimensions): ObstacleDimensions {
  const scale = GAME_CONFIG.OBSTACLE_ASSET_SCALE;
  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
  };
}

/** Runtime gameplay/collision footprints — design base × `OBSTACLE_ASSET_SCALE`. */
export const OBSTACLE_VARIANT_DIMENSIONS: Record<ObstacleVariant, ObstacleDimensions> = {
  small_rock: scaleObstacleDimensions(GAME_CONFIG.SMALL_ROCK_SIZE),
  large_boulder: scaleObstacleDimensions(GAME_CONFIG.LARGE_BOULDER_SIZE),
  tree: scaleObstacleDimensions(GAME_CONFIG.TREE_SIZE),
  tree_stump: scaleObstacleDimensions(GAME_CONFIG.TREE_STUMP_SIZE),
  cabin: scaleObstacleDimensions(GAME_CONFIG.CABIN_SIZE),
  wooden_fence: scaleObstacleDimensions(GAME_CONFIG.WOODEN_FENCE_SIZE),
};

export const OBSTACLE_VARIANT_SEQUENCE: readonly ObstacleVariant[] = [
  'small_rock',
  'large_boulder',
  'tree',
  'tree_stump',
  'cabin',
  'wooden_fence',
];
