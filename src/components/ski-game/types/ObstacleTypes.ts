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
};

export type ObstaclePoolState = {
  obstacles: ObstacleRecord[];
  activeCount: number;
  nextObstacleId: number;
  rngState: number;
  spawnWeightTotal: number;
};

export const OBSTACLE_VARIANT_DIMENSIONS: Record<ObstacleVariant, ObstacleDimensions> = {
  small_rock: GAME_CONFIG.SMALL_ROCK_SIZE,
  large_boulder: GAME_CONFIG.LARGE_BOULDER_SIZE,
  tree: GAME_CONFIG.TREE_SIZE,
  tree_stump: GAME_CONFIG.TREE_STUMP_SIZE,
  cabin: GAME_CONFIG.CABIN_SIZE,
  wooden_fence: GAME_CONFIG.WOODEN_FENCE_SIZE,
};

export const OBSTACLE_VARIANT_SEQUENCE: readonly ObstacleVariant[] = [
  'small_rock',
  'large_boulder',
  'tree',
  'tree_stump',
  'cabin',
  'wooden_fence',
];
