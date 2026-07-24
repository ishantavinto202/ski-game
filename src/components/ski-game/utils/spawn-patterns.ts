import { logCabinSpawnRequestCreated } from './cabin-debug';
import { SPAWN_PATTERN_LIBRARY, SPAWN_PATTERN_WEIGHT_TOTAL } from '../managers/SpawnPatterns';
import type { ObstaclePoolState, ObstacleVariant } from '../types/ObstacleTypes';
import type { SpawnPattern } from '../types/SpawnPatternTypes';
import type { SpawnManagerState, SpawnRequest } from '../types/SpawnTypes';
import { GAME_CONFIG } from './GameConfig';
import {
  clampPatternLaneIndex,
  isObstacleSpawnSpacingValid,
  logObstacleSpacingRejected,
  logObstacleSpacingRepositioned,
  recordPatternAcceptedObstacleSpacing,
  resolveObstaclePlacementLaneDelta,
} from './obstacle-spacing';

export function pickWeightedSpawnPattern(spawnState: SpawnManagerState): SpawnPattern {
  spawnState.patternRngState = (spawnState.patternRngState * 1664525 + 1013904223) >>> 0;

  const total = SPAWN_PATTERN_WEIGHT_TOTAL;
  if (total <= 0) {
    return SPAWN_PATTERN_LIBRARY[0];
  }

  let roll = spawnState.patternRngState % total;
  const library = SPAWN_PATTERN_LIBRARY;
  for (let index = 0; index < library.length; index += 1) {
    roll -= library[index].weight;
    if (roll < 0) {
      return library[index];
    }
  }

  return library[0];
}

export function advanceSpawnRng(spawnState: SpawnManagerState): number {
  spawnState.patternRngState = (spawnState.patternRngState * 1664525 + 1013904223) >>> 0;
  return spawnState.patternRngState;
}

export function randomIntInclusive(spawnState: SpawnManagerState, min: number, max: number): number {
  const lower = min <= max ? min : max;
  const upper = min <= max ? max : min;
  const span = upper - lower + 1;
  if (span <= 1) {
    return lower;
  }
  return lower + (advanceSpawnRng(spawnState) % span);
}

export function resolvePatternLaneIndex(
  centerLaneIndex: number,
  laneOffset: number,
  laneCount: number,
): number {
  let laneIndex = centerLaneIndex + laneOffset;
  if (laneIndex < 0) {
    laneIndex = 0;
  } else if (laneIndex >= laneCount) {
    laneIndex = laneCount - 1;
  }
  return laneIndex;
}

export function resolvePatternWorldX(
  playableOriginX: number,
  laneWidth: number,
  laneIndex: number,
): number {
  return playableOriginX + laneWidth * (laneIndex + 0.5);
}

export function writeObstacleSpawnRequest(
  slot: SpawnRequest,
  params: {
    id: number;
    worldX: number;
    worldY: number;
    laneIndex: number;
    variant: ObstacleVariant;
  },
): void {
  slot.id = params.id;
  slot.kind = 'obstacle';
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.laneIndex = params.laneIndex;
  slot.obstacleVariant = params.variant;
  slot.active = true;
}

/** Writes pattern obstacles into pre-allocated request slots; returns count written. */
export function enqueueSpawnPatternRequests(
  spawnState: SpawnManagerState,
  pattern: SpawnPattern,
  patternOriginY: number,
  centerLaneIndex: number,
  obstaclePool: ObstaclePoolState,
): number {
  const { laneCount, laneWidth, playableOriginX, requests } = spawnState;
  const obstacles = pattern.obstacles;
  let written = 0;
  let patternAcceptedCount = 0;
  const maxAttempts = GAME_CONFIG.MAX_OBSTACLE_PLACEMENT_ATTEMPTS;

  for (let index = 0; index < obstacles.length; index += 1) {
    if (spawnState.pendingCount >= requests.length) {
      break;
    }

    const entry = obstacles[index];
    const baseLaneIndex = resolvePatternLaneIndex(centerLaneIndex, entry.laneOffset, laneCount);
    const worldY = patternOriginY - entry.forwardOffset;
    const originalWorldX = resolvePatternWorldX(playableOriginX, laneWidth, baseLaneIndex);

    let placed = false;
    let placedWorldX = originalWorldX;
    let placedLaneIndex = baseLaneIndex;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const laneDelta = resolveObstaclePlacementLaneDelta(attempt, index);
      const candidateLaneIndex = clampPatternLaneIndex(baseLaneIndex + laneDelta, laneCount);
      const candidateWorldX = resolvePatternWorldX(playableOriginX, laneWidth, candidateLaneIndex);

      if (
        isObstacleSpawnSpacingValid(
          candidateWorldX,
          worldY,
          entry.variant,
          obstaclePool,
          requests,
          spawnState.pendingCount,
          patternAcceptedCount,
        )
      ) {
        placed = true;
        placedWorldX = candidateWorldX;
        placedLaneIndex = candidateLaneIndex;
        if (attempt > 0) {
          logObstacleSpacingRepositioned(
            entry.variant,
            originalWorldX,
            candidateWorldX,
            worldY,
            attempt,
          );
        }
        break;
      }
    }

    if (!placed) {
      logObstacleSpacingRejected(entry.variant, originalWorldX, worldY);
      continue;
    }

    const slotIndex = spawnState.pendingCount;
    writeObstacleSpawnRequest(requests[slotIndex], {
      id: spawnState.nextRequestId,
      worldX: placedWorldX,
      worldY,
      laneIndex: placedLaneIndex,
      variant: entry.variant,
    });
    if (entry.variant === 'cabin') {
      logCabinSpawnRequestCreated();
    }
    spawnState.nextRequestId += 1;
    spawnState.pendingCount += 1;
    written += 1;
    patternAcceptedCount = recordPatternAcceptedObstacleSpacing(
      placedWorldX,
      worldY,
      entry.variant,
      patternAcceptedCount,
    );
  }

  return written;
}
