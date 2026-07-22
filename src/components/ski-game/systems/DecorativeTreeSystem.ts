import {
  activateDecorativeTree,
  deactivateDecorativeTree,
  findInactiveDecorativeTreeSlot,
} from '../entities/DecorativeTree';
import type { GameEngine } from '../engine/GameEngine';
import type { SpawnManagerState } from '../types/SpawnTypes';
import type { GameSystem } from '../types';
import type { DecorativeTreePoolState } from '../types/DecorativeTreeTypes';
import { worldYCenterToScreenY } from '../utils/world-coordinates';
import { GAME_CONFIG } from '../utils/GameConfig';

export const DECORATIVE_TREE_SYSTEM_ID = 'decorative-tree-system';

function advanceEdgeTreeRng(pool: DecorativeTreePoolState): number {
  pool.edgeTreeRngState = (pool.edgeTreeRngState * 1664525 + 1013904223) >>> 0;
  return pool.edgeTreeRngState;
}

function randomIntFromPoolRng(pool: DecorativeTreePoolState, min: number, max: number): number {
  const lower = min <= max ? min : max;
  const upper = min <= max ? max : min;
  const span = upper - lower + 1;
  if (span <= 1) {
    return lower;
  }
  return lower + (advanceEdgeTreeRng(pool) % span);
}

function beginEdgeTreeCluster(pool: DecorativeTreePoolState): void {
  pool.edgeTreesLeftInCluster = randomIntFromPoolRng(
    pool,
    GAME_CONFIG.EDGE_TREE_CLUSTER_SIZE_MIN,
    GAME_CONFIG.EDGE_TREE_CLUSTER_SIZE_MAX,
  );
}

function advanceEdgeTreeCursorAfterCluster(pool: DecorativeTreePoolState): void {
  pool.nextEdgeTreeWorldY += randomIntFromPoolRng(
    pool,
    GAME_CONFIG.EDGE_TREE_CLUSTER_GAP_MIN,
    GAME_CONFIG.EDGE_TREE_CLUSTER_GAP_MAX,
  );
}

function advanceEdgeTreeCursorWithinCluster(pool: DecorativeTreePoolState): void {
  pool.nextEdgeTreeWorldY += randomIntFromPoolRng(
    pool,
    GAME_CONFIG.EDGE_TREE_IN_CLUSTER_SPACING_MIN,
    GAME_CONFIG.EDGE_TREE_IN_CLUSTER_SPACING_MAX,
  );
}

function treeIntersectsPlayableCorridor(
  centerX: number,
  treeWidth: number,
  playableLeft: number,
  playableRight: number,
): boolean {
  const half = treeWidth * 0.5;
  return centerX - half < playableRight && centerX + half > playableLeft;
}

function resolveEdgeTreeCentersFromPlayableCorridor(
  spawnState: SpawnManagerState,
  treeWidth: number,
): { leftX: number; rightX: number; playableLeft: number; playableRight: number } | null {
  const { laneCount, laneWidth, playableOriginX } = spawnState;
  if (laneCount <= 0 || laneWidth <= 0) {
    return null;
  }

  const playableLeft = playableOriginX;
  const playableRight = playableOriginX + laneWidth * laneCount;
  const margin = GAME_CONFIG.EDGE_TREE_MARGIN;

  return {
    leftX: playableLeft - margin - treeWidth * 0.5,
    rightX: playableRight + margin + treeWidth * 0.5,
    playableLeft,
    playableRight,
  };
}

function spawnEdgeTreePairAtWorldY(
  engine: GameEngine,
  pool: DecorativeTreePoolState,
  worldY: number,
): void {
  const spawnState = engine.spawnRef.current;
  const { TREE_SIZE } = GAME_CONFIG;
  const treeWidth = TREE_SIZE.width;
  const treeHeight = TREE_SIZE.height;

  const centers = resolveEdgeTreeCentersFromPlayableCorridor(spawnState, treeWidth);
  if (!centers) {
    return;
  }

  const { leftX, rightX, playableLeft, playableRight } = centers;

  if (!treeIntersectsPlayableCorridor(leftX, treeWidth, playableLeft, playableRight)) {
    const leftSlot = findInactiveDecorativeTreeSlot(pool);
    if (leftSlot) {
      activateDecorativeTree(leftSlot, pool, {
        worldX: leftX,
        worldY,
        width: treeWidth,
        height: treeHeight,
      });
    }
  }

  if (!treeIntersectsPlayableCorridor(rightX, treeWidth, playableLeft, playableRight)) {
    const rightSlot = findInactiveDecorativeTreeSlot(pool);
    if (rightSlot) {
      activateDecorativeTree(rightSlot, pool, {
        worldX: rightX,
        worldY,
        width: treeWidth,
        height: treeHeight,
      });
    }
  }
}

export function resetEdgeTreeFillState(pool: DecorativeTreePoolState): void {
  pool.nextEdgeTreeWorldY = 0;
  pool.edgeTreeFillInitialized = false;
  pool.edgeTreeRngState = 0x6c078965;
  pool.edgeTreesLeftInCluster = 0;
}

export function maintainDecorativeEdgeTreesAhead(
  engine: GameEngine,
  pool: DecorativeTreePoolState,
): void {
  if (!GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
    return;
  }

  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return;
  }

  const spawnState = engine.spawnRef.current;
  if (spawnState.laneCount <= 0 || spawnState.laneWidth <= 0) {
    return;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const fillTargetY = scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD + viewport.height * 0.25;

  if (!pool.edgeTreeFillInitialized) {
    pool.nextEdgeTreeWorldY = scrollOffsetY + GAME_CONFIG.SPAWN_LOOKAHEAD_DISTANCE;
    pool.edgeTreeFillInitialized = true;
    pool.edgeTreesLeftInCluster = 0;
  }

  let guard = 0;
  while (pool.nextEdgeTreeWorldY <= fillTargetY && guard < 16) {
    if (pool.edgeTreesLeftInCluster <= 0) {
      beginEdgeTreeCluster(pool);
    }

    spawnEdgeTreePairAtWorldY(engine, pool, pool.nextEdgeTreeWorldY);
    pool.edgeTreesLeftInCluster -= 1;

    if (pool.edgeTreesLeftInCluster <= 0) {
      advanceEdgeTreeCursorAfterCluster(pool);
    } else {
      advanceEdgeTreeCursorWithinCluster(pool);
    }

    guard += 1;
  }
}

export class DecorativeTreeSystem implements GameSystem {
  readonly id = DECORATIVE_TREE_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
  }

  unmount(): void {
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    if (!GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
      return;
    }

    const engine = this.engine;
    if (!engine) {
      return;
    }

    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.DECORATIVE_TREE_DESPAWN_MARGIN;
    const pool = engine.decorativeTreeRef.current;

    maintainDecorativeEdgeTreesAhead(engine, pool);

    const trees = pool.trees;

    for (let index = 0; index < trees.length; index += 1) {
      const tree = trees[index];
      if (!tree.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, tree.worldY);
      if (screenY > despawnScreenY) {
        deactivateDecorativeTree(tree, pool);
      }
    }
  }
}
