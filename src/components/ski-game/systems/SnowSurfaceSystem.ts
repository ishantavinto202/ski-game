import {
  activateSnowSurface,
  deactivateSnowSurface,
  findInactiveSnowSurfaceSlot,
} from '../entities/SnowSurface';
import type { GameEngine } from '../engine/GameEngine';
import {
  profileSnowOverlap,
  profileSnowPlacementAttempt,
} from '../profiling/PerformanceProfiling';
import type { GameSystem } from '../types';
import type { ObstaclePoolState, ObstacleRecord } from '../types/ObstacleTypes';
import type { SnowSurfacePoolState, SnowSurfaceTypeIndex } from '../types/SnowSurfaceTypes';
import {
  resolveSnowSurfaceBaseHeight,
  SNOW_SURFACE_ASSETS,
  SNOW_SURFACE_SPAWN_WEIGHT_TOTAL,
} from '../utils/snow-surface-assets';
import { GAME_CONFIG } from '../utils/GameConfig';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const SNOW_SURFACE_SYSTEM_ID = 'snow-surface-system';

function advanceRng(pool: SnowSurfacePoolState): number {
  pool.rngState = (pool.rngState * 1664525 + 1013904223) >>> 0;
  return pool.rngState;
}

function randomInt(pool: SnowSurfacePoolState, min: number, max: number): number {
  const lower = min <= max ? min : max;
  const upper = min <= max ? max : min;
  const span = upper - lower + 1;
  if (span <= 1) {
    return lower;
  }
  return lower + (advanceRng(pool) % span);
}

function randomUnit(pool: SnowSurfacePoolState): number {
  return advanceRng(pool) / 0x100000000;
}

function pickTypeIndex(pool: SnowSurfacePoolState): SnowSurfaceTypeIndex {
  let roll = advanceRng(pool) % SNOW_SURFACE_SPAWN_WEIGHT_TOTAL;
  for (let index = 0; index < SNOW_SURFACE_ASSETS.length; index += 1) {
    roll -= SNOW_SURFACE_ASSETS[index].spawnWeight;
    if (roll < 0) {
      return index as SnowSurfaceTypeIndex;
    }
  }
  return (SNOW_SURFACE_ASSETS.length - 1) as SnowSurfaceTypeIndex;
}

function pickScale(pool: SnowSurfacePoolState, typeIndex: SnowSurfaceTypeIndex): number {
  const asset = SNOW_SURFACE_ASSETS[typeIndex];
  const min = asset.scaleMin ?? GAME_CONFIG.SNOW_SURFACE_SCALE_MIN;
  const max = asset.scaleMax ?? GAME_CONFIG.SNOW_SURFACE_SCALE_MAX;
  return min + (max - min) * randomUnit(pool);
}

/** Uniform X across playable width (no left/right band bias). */
function pickWorldCenterX(
  pool: SnowSurfacePoolState,
  viewportWidth: number,
  detailWidth: number,
): number {
  const padding = GAME_CONFIG.SNOW_SURFACE_HORIZONTAL_PADDING;
  const half = detailWidth * 0.5;
  const minCenter = padding + half;
  const maxCenter = viewportWidth - padding - half;
  if (maxCenter <= minCenter) {
    return viewportWidth * 0.5;
  }

  return minCenter + randomUnit(pool) * (maxCenter - minCenter);
}

/** Cosmetic AABB overlap vs obstacle visual footprint (+ padding). No gameplay collision. */
function snowDetailOverlapsObstacleVisual(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  obstacle: ObstacleRecord,
  padding: number,
): boolean {
  profileSnowOverlap();
  const halfH = (height + obstacle.height) * 0.5 + padding;
  const deltaY = worldY - obstacle.worldY;
  if (deltaY >= halfH || deltaY <= -halfH) {
    return false;
  }
  const halfW = (width + obstacle.width) * 0.5 + padding;
  const deltaX = worldX - obstacle.worldX;
  return deltaX < halfW && deltaX > -halfW;
}

function snowDetailOverlapsAnyObstacle(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  obstaclePool: ObstaclePoolState,
  padding: number,
): boolean {
  const obstacles = obstaclePool.obstacles;
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active) {
      continue;
    }
    if (snowDetailOverlapsObstacleVisual(worldX, worldY, width, height, obstacle, padding)) {
      return true;
    }
  }
  return false;
}

function advanceCursor(pool: SnowSurfacePoolState): void {
  pool.nextWorldY += randomInt(
    pool,
    GAME_CONFIG.SNOW_SURFACE_SPACING_MIN,
    GAME_CONFIG.SNOW_SURFACE_SPACING_MAX,
  );
}

/**
 * Try to place one detail at the current cursor Y.
 * Bounded X retries vs active obstacle visuals; skip activate if none are clear.
 */
function spawnOneAtCursor(engine: GameEngine, pool: SnowSurfacePoolState): void {
  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return;
  }

  const slot = findInactiveSnowSurfaceSlot(pool);
  if (!slot) {
    return;
  }

  const typeIndex = pickTypeIndex(pool);
  const asset = SNOW_SURFACE_ASSETS[typeIndex];
  const scale = pickScale(pool, typeIndex);
  const width = asset.baseWidth * scale;
  const height = resolveSnowSurfaceBaseHeight(asset) * scale;
  const worldY = pool.nextWorldY;
  const padding = GAME_CONFIG.SNOW_SURFACE_PLACEMENT_OBSTACLE_PADDING;
  const obstaclePool = engine.obstacleRef.current;
  const maxAttempts = GAME_CONFIG.SNOW_SURFACE_MAX_PLACEMENT_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    profileSnowPlacementAttempt(attempt > 0);
    const worldX = pickWorldCenterX(pool, viewport.width, width);
    if (snowDetailOverlapsAnyObstacle(worldX, worldY, width, height, obstaclePool, padding)) {
      continue;
    }

    activateSnowSurface(slot, pool, {
      worldX,
      worldY,
      width,
      height,
      typeIndex,
    });
    return;
  }
  // All attempts overlapped — leave slot inactive; cursor still advances.
}

function deactivateSnowDetailsOverlappingObstacles(
  pool: SnowSurfacePoolState,
  obstaclePool: ObstaclePoolState,
): void {
  const padding = GAME_CONFIG.SNOW_SURFACE_RUNTIME_OBSTACLE_PADDING;
  const details = pool.details;
  for (let index = 0; index < details.length; index += 1) {
    const detail = details[index];
    if (!detail.active) {
      continue;
    }
    if (
      snowDetailOverlapsAnyObstacle(
        detail.worldX,
        detail.worldY,
        detail.width,
        detail.height,
        obstaclePool,
        padding,
      )
    ) {
      deactivateSnowSurface(detail, pool);
    }
  }
}

export function maintainSnowSurfaceAhead(engine: GameEngine, pool: SnowSurfacePoolState): void {
  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const fillTargetY = scrollOffsetY + GAME_CONFIG.SNOW_SURFACE_LOOKAHEAD;

  if (!pool.fillInitialized) {
    pool.nextWorldY = scrollOffsetY + GAME_CONFIG.SNOW_SURFACE_INITIAL_LEAD;
    pool.fillInitialized = true;
  }

  // Denser 70–150 spacing needs more fills per step across lookahead.
  let guard = 0;
  while (pool.nextWorldY <= fillTargetY && guard < 24) {
    spawnOneAtCursor(engine, pool);
    advanceCursor(pool);
    guard += 1;
  }
}

export class SnowSurfaceSystem implements GameSystem {
  readonly id = SNOW_SURFACE_SYSTEM_ID;

  private engine: GameEngine | null = null;
  private lastObservedNextObstacleId = -1;

  mount(engine: GameEngine): void {
    this.engine = engine;
    this.lastObservedNextObstacleId = -1;
  }

  unmount(): void {
    this.engine = null;
    this.lastObservedNextObstacleId = -1;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.SNOW_SURFACE_DESPAWN_MARGIN;
    const pool = engine.snowSurfaceRef.current;
    const obstaclePool = engine.obstacleRef.current;

    // The overlap relationship only changes when an obstacle generation is added.
    // Avoid the full detail × obstacle scan on fixed steps with an unchanged pool.
    if (this.lastObservedNextObstacleId !== obstaclePool.nextObstacleId) {
      deactivateSnowDetailsOverlappingObstacles(pool, obstaclePool);
      this.lastObservedNextObstacleId = obstaclePool.nextObstacleId;
    }

    maintainSnowSurfaceAhead(engine, pool);

    const details = pool.details;
    for (let index = 0; index < details.length; index += 1) {
      const detail = details[index];
      if (!detail.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, detail.worldY);
      if (screenY - detail.height * 0.5 > despawnScreenY) {
        deactivateSnowSurface(detail, pool);
      }
    }
  }
}
