import { GAME_CONFIG } from '../utils/GameConfig';

import type { DecorativeTreePoolState, DecorativeTreeRecord } from '../types/DecorativeTreeTypes';

export function createInactiveDecorativeTreeRecord(): DecorativeTreeRecord {
  return {
    worldX: 0,
    worldY: 0,
    width: 0,
    height: 0,
    active: false,
  };
}

export function createDecorativeTreePoolState(): DecorativeTreePoolState {
  const maxTrees = GAME_CONFIG.MAX_DECORATIVE_TREES;
  const trees: DecorativeTreeRecord[] = new Array(maxTrees);
  for (let index = 0; index < maxTrees; index += 1) {
    trees[index] = createInactiveDecorativeTreeRecord();
  }

  return {
    trees,
    activeCount: 0,
    nextEdgeTreeWorldY: 0,
    edgeTreeFillInitialized: false,
    edgeTreeRngState: 0x6c078965,
    edgeTreesLeftInCluster: 0,
  };
}

export function findInactiveDecorativeTreeSlot(
  pool: DecorativeTreePoolState,
): DecorativeTreeRecord | null {
  const trees = pool.trees;
  for (let index = 0; index < trees.length; index += 1) {
    if (!trees[index].active) {
      return trees[index];
    }
  }
  return null;
}

export function activateDecorativeTree(
  slot: DecorativeTreeRecord,
  pool: DecorativeTreePoolState,
  params: { worldX: number; worldY: number; width: number; height: number },
): void {
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = params.width;
  slot.height = params.height;
  slot.active = true;
  pool.activeCount += 1;
}

export function deactivateDecorativeTree(
  slot: DecorativeTreeRecord,
  pool: DecorativeTreePoolState,
): void {
  if (!slot.active) {
    return;
  }
  slot.active = false;
  pool.activeCount -= 1;
  if (pool.activeCount < 0) {
    pool.activeCount = 0;
  }
}

export function resetDecorativeTreeSlotInPlace(slot: DecorativeTreeRecord): void {
  slot.active = false;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.width = 0;
  slot.height = 0;
}

export function resetDecorativeTreePoolInPlace(pool: DecorativeTreePoolState): void {
  const trees = pool.trees;
  for (let index = 0; index < trees.length; index += 1) {
    resetDecorativeTreeSlotInPlace(trees[index]);
  }
  pool.activeCount = 0;
  pool.nextEdgeTreeWorldY = 0;
  pool.edgeTreeFillInitialized = false;
  pool.edgeTreeRngState = 0x6c078965;
  pool.edgeTreesLeftInCluster = 0;
}
