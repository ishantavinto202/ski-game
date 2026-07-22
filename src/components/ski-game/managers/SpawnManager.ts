import type { GameEngine } from '../engine/GameEngine';
import {
  createInitialSpawnManagerState,
  SPAWN_KIND_SEQUENCE,
  type SpawnKind,
  type SpawnManagerState,
} from '../types/SpawnTypes';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';
import { maintainSpawnPopulationAhead } from '../utils/spawn-population';
import { spawnWorldYAboveViewport } from '../utils/world-coordinates';
import { findClearPickupSpawn, type PickupSpawnKind } from '../utils/spawn-validation';
import {
  logCoinPickupTimerFired,
  logCoinSpawnRequestCreated,
  logCoinTryEnqueuePickupSpawn,
  tickCoinSchedulingPoolDebug,
} from '../utils/coin-scheduling-debug';

export const SPAWN_MANAGER_ID = 'spawn-manager';

type RotatingPickupKind = 'coin' | 'shield';

function isRotatingPickupKind(kind: SpawnKind): kind is RotatingPickupKind {
  return kind === 'coin' || kind === 'shield';
}

function resolveSpawnIntervalMultiplier(engine: GameEngine): number {
  return engine.difficultyRef.current.spawnIntervalMultiplier;
}

function canEnqueuePickup(spawnState: SpawnManagerState): boolean {
  return (
    spawnState.laneCount > 0 &&
    spawnState.laneWidth > 0 &&
    spawnState.pendingCount < spawnState.requests.length
  );
}

function resolvePickupBaseWorldY(engine: GameEngine, spawnState: SpawnManagerState): number {
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const leadFromScroll = spawnWorldYAboveViewport(engine, GAME_CONFIG.POPULATION_LOOKAHEAD);
  if (!spawnState.populationCursorInitialized) {
    return leadFromScroll;
  }
  return Math.max(leadFromScroll, spawnState.nextPatternOriginY);
}

function tryEnqueuePickupSpawn(
  engine: GameEngine,
  spawnState: SpawnManagerState,
  kind: PickupSpawnKind,
): boolean {
  const isCoinKind = kind === 'coin';
  const maxPending = spawnState.requests.length;

  if (!canEnqueuePickup(spawnState)) {
    if (isCoinKind) {
      const failureReason =
        spawnState.laneCount <= 0 || spawnState.laneWidth <= 0
          ? 'lane layout not ready'
          : 'pendingCount >= max';
      logCoinTryEnqueuePickupSpawn({
        called: true,
        returned: false,
        failureReason,
        pendingCount: spawnState.pendingCount,
        maxPending,
      });
    }
    return false;
  }

  const baseWorldY = resolvePickupBaseWorldY(engine, spawnState);
  const startLaneIndex = spawnState.laneCursor;
  spawnState.laneCursor = (spawnState.laneCursor + 1) % spawnState.laneCount;

  const placement = findClearPickupSpawn(
    baseWorldY,
    startLaneIndex,
    spawnState.laneCount,
    spawnState.laneWidth,
    spawnState.playableOriginX,
    kind,
    engine.obstacleRef.current,
    spawnState.requests,
    spawnState.pendingCount,
  );

  if (!placement) {
    if (isCoinKind) {
      logCoinTryEnqueuePickupSpawn({
        called: true,
        returned: false,
        failureReason: 'no placement found',
        pendingCount: spawnState.pendingCount,
        maxPending,
      });
    }
    return false;
  }

  const slotIndex = spawnState.pendingCount;
  const slot = spawnState.requests[slotIndex];
  slot.id = spawnState.nextRequestId;
  spawnState.nextRequestId += 1;
  slot.kind = kind;
  slot.worldX = placement.worldX;
  slot.worldY = placement.worldY;
  slot.laneIndex = placement.laneIndex;
  slot.obstacleVariant = null;
  slot.active = true;

  spawnState.pendingCount += 1;

  if (isCoinKind) {
    logCoinTryEnqueuePickupSpawn({
      called: true,
      returned: true,
      pendingCount: spawnState.pendingCount,
      maxPending,
    });
    logCoinSpawnRequestCreated(slot.id, slot.worldX, slot.worldY);
  }

  return true;
}

function tickRotatingPickupSpawn(
  engine: GameEngine,
  spawnState: SpawnManagerState,
  fixedDeltaMs: number,
): void {
  spawnState.elapsedSinceLastSpawnMs += fixedDeltaMs;

  const effectiveSpawnInterval =
    GAME_CONFIG.SPAWN_INTERVAL * resolveSpawnIntervalMultiplier(engine);
  if (spawnState.elapsedSinceLastSpawnMs < effectiveSpawnInterval) {
    return;
  }
  spawnState.elapsedSinceLastSpawnMs -= effectiveSpawnInterval;

  const kindCursor = spawnState.kindCursor;
  const selectedKind = SPAWN_KIND_SEQUENCE[kindCursor % SPAWN_KIND_SEQUENCE.length];
  const canEnqueue = canEnqueuePickup(spawnState);

  logCoinPickupTimerFired({
    kindCursor,
    selectedKind,
    pendingCount: spawnState.pendingCount,
    canEnqueue,
  });

  // Obstacle steps in the rotation never emit pickups; always advance cadence.
  if (selectedKind === 'obstacle') {
    spawnState.kindCursor = (spawnState.kindCursor + 1) % SPAWN_KIND_SEQUENCE.length;
    return;
  }

  if (isRotatingPickupKind(selectedKind) && canEnqueue) {
    tryEnqueuePickupSpawn(engine, spawnState, selectedKind);

    if (selectedKind === 'coin') {
      tryEnqueuePickupSpawn(engine, spawnState, 'speed_boost');
    }
  }

  // Always advance pickup/shield/coin cadence — never stall the rotation on a failed placement.
  spawnState.kindCursor = (spawnState.kindCursor + 1) % SPAWN_KIND_SEQUENCE.length;
}

export class SpawnManager implements GameSystem {
  readonly id = SPAWN_MANAGER_ID;

  private engine: GameEngine | null = null;
  private removeViewportListener: (() => void) | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.spawnRef.current = createInitialSpawnManagerState();
    this.removeViewportListener = engine.onViewportChange(this.handleViewportChange);
    this.refreshLaneLayout(engine);
  }

  unmount(): void {
    this.removeViewportListener?.();
    this.removeViewportListener = null;
    if (this.engine) {
      this.engine.spawnRef.current = createInitialSpawnManagerState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const spawnState = engine.spawnRef.current;

    tickRotatingPickupSpawn(engine, spawnState, fixedDeltaMs);

    if (spawnState.laneCount > 0 && spawnState.laneWidth > 0) {
      maintainSpawnPopulationAhead(engine, spawnState);
    }

    tickCoinSchedulingPoolDebug(engine, fixedDeltaMs);
  }

  private handleViewportChange = (engine: GameEngine): void => {
    this.refreshLaneLayout(engine);
  };

  private refreshLaneLayout(engine: GameEngine): void {
    const viewport = engine.viewportRef.current;
    const spawnState = engine.spawnRef.current;
    if (!viewport) {
      return;
    }

    const { PLAYABLE_WORLD_PADDING, OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO } = GAME_CONFIG;

    const playableWidth = viewport.width - PLAYABLE_WORLD_PADDING * 2;
    if (playableWidth <= 0) {
      spawnState.laneCount = 0;
      spawnState.laneWidth = 0;
      return;
    }

    const minLaneWidth = playableWidth * OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO;
    let laneCount = Math.floor(playableWidth / minLaneWidth);
    if (laneCount < 3) {
      laneCount = 3;
    }
    if (laneCount > 8) {
      laneCount = 8;
    }

    spawnState.playableOriginX = PLAYABLE_WORLD_PADDING;
    spawnState.laneCount = laneCount;
    spawnState.laneWidth = playableWidth / laneCount;
    spawnState.laneCursor = spawnState.laneCursor % laneCount;
  }
}
