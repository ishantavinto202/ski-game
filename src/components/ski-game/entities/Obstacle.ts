import { GAME_CONFIG } from '../utils/GameConfig';
import { profileObstacleSpawn } from '../profiling/PerformanceProfiling';

import {
  OBSTACLE_VARIANT_DIMENSIONS,
  type ObstaclePoolState,
  type ObstacleRecord,
  type ObstacleVariant,
} from '../types/ObstacleTypes';

export function createInactiveObstacleRecord(): ObstacleRecord {
  return {
    id: 0,
    variant: 'small_rock',
    worldX: 0,
    worldY: 0,
    width: 0,
    height: 0,
    active: false,
    spawnRequestId: 0,
    laneIndex: 0,
    treeVisualVariant: 0,
  };
}

function pickTreeVisualVariant(pool: ObstaclePoolState): 0 | 1 | 2 {
  pool.rngState = (pool.rngState * 1664525 + 1013904223) >>> 0;
  return (pool.rngState % 3) as 0 | 1 | 2;
}

export function createObstaclePoolState(): ObstaclePoolState {
  const maxObstacles = GAME_CONFIG.MAX_OBSTACLES;
  const obstacles: ObstacleRecord[] = new Array(maxObstacles);
  for (let index = 0; index < maxObstacles; index += 1) {
    obstacles[index] = createInactiveObstacleRecord();
  }

  const spawnWeightTotal =
    GAME_CONFIG.SMALL_ROCK_SPAWN_WEIGHT +
    GAME_CONFIG.LARGE_BOULDER_SPAWN_WEIGHT +
    GAME_CONFIG.TREE_SPAWN_WEIGHT +
    GAME_CONFIG.TREE_STUMP_SPAWN_WEIGHT +
    GAME_CONFIG.CABIN_SPAWN_WEIGHT +
    GAME_CONFIG.WOODEN_FENCE_SPAWN_WEIGHT;

  return {
    obstacles,
    activeCount: 0,
    nextObstacleId: 1,
    rngState: 0x9e3779b9,
    spawnWeightTotal,
  };
}

export function findInactiveObstacleSlot(pool: ObstaclePoolState): ObstacleRecord | null {
  const obstacles = pool.obstacles;
  for (let index = 0; index < obstacles.length; index += 1) {
    if (!obstacles[index].active) {
      return obstacles[index];
    }
  }
  return null;
}

export function activateObstacleFromSpawn(
  slot: ObstacleRecord,
  pool: ObstaclePoolState,
  params: {
    variant: ObstacleVariant;
    worldX: number;
    worldY: number;
    spawnRequestId: number;
    laneIndex: number;
  },
): void {
  const dimensions = OBSTACLE_VARIANT_DIMENSIONS[params.variant];

  slot.id = pool.nextObstacleId;
  pool.nextObstacleId += 1;
  slot.variant = params.variant;
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = dimensions.width;
  slot.height = dimensions.height;
  slot.spawnRequestId = params.spawnRequestId;
  slot.laneIndex = params.laneIndex;
  slot.treeVisualVariant = params.variant === 'tree' ? pickTreeVisualVariant(pool) : 0;
  slot.active = true;

  pool.activeCount += 1;
  profileObstacleSpawn();
}

export function deactivateObstacle(slot: ObstacleRecord, pool: ObstaclePoolState): void {
  if (!slot.active) {
    return;
  }

  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  slot.treeVisualVariant = 0;
  pool.activeCount -= 1;
  if (pool.activeCount < 0) {
    pool.activeCount = 0;
  }
}

export function pickWeightedObstacleVariant(
  pool: ObstaclePoolState,
): ObstacleVariant {
  const {
    SMALL_ROCK_SPAWN_WEIGHT,
    LARGE_BOULDER_SPAWN_WEIGHT,
    TREE_SPAWN_WEIGHT,
    TREE_STUMP_SPAWN_WEIGHT,
    CABIN_SPAWN_WEIGHT,
  } = GAME_CONFIG;

  pool.rngState = (pool.rngState * 1664525 + 1013904223) >>> 0;

  const total = pool.spawnWeightTotal;
  if (total <= 0) {
    return 'small_rock';
  }

  let roll = pool.rngState % total;
  roll -= SMALL_ROCK_SPAWN_WEIGHT;
  if (roll < 0) {
    return 'small_rock';
  }
  roll -= LARGE_BOULDER_SPAWN_WEIGHT;
  if (roll < 0) {
    return 'large_boulder';
  }
  roll -= TREE_SPAWN_WEIGHT;
  if (roll < 0) {
    return 'tree';
  }
  roll -= TREE_STUMP_SPAWN_WEIGHT;
  if (roll < 0) {
    return 'tree_stump';
  }
  roll -= CABIN_SPAWN_WEIGHT;
  if (roll < 0) {
    return 'cabin';
  }
  return 'wooden_fence';
}
