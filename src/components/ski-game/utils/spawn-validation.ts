import type { CoinPoolState } from '../types/CoinTypes';
import type { ObstaclePoolState, ObstacleVariant } from '../types/ObstacleTypes';
import { OBSTACLE_VARIANT_DIMENSIONS } from '../types/ObstacleTypes';
import type { ShieldPoolState } from '../types/ShieldTypes';
import type { SpeedBoostPoolState } from '../types/SpeedBoostTypes';
import type { SpawnPattern } from '../types/SpawnPatternTypes';
import type { SpawnRequest } from '../types/SpawnTypes';
import { COIN_WORLD_SIZE } from '../types/CoinTypes';
import { SHIELD_WORLD_SIZE } from '../types/ShieldTypes';
import { SPEED_BOOST_WORLD_SIZE } from '../types/SpeedBoostTypes';
import {
  profileSpawnRejected,
  profileSpawnValidationRetry,
} from '../profiling/PerformanceProfiling';
import { GAME_CONFIG } from './GameConfig';
import { resolvePatternLaneIndex, resolvePatternWorldX } from './spawn-patterns';

export type SpawnFootprint = {
  minLane: number;
  maxLane: number;
  minWorldY: number;
  maxWorldY: number;
  minWorldX: number;
  maxWorldX: number;
};

/** Module scratches — never return these from public APIs that callers may retain. */
const footprintScratchA: SpawnFootprint = {
  minLane: 0,
  maxLane: 0,
  minWorldY: 0,
  maxWorldY: 0,
  minWorldX: 0,
  maxWorldX: 0,
};
const footprintScratchB: SpawnFootprint = {
  minLane: 0,
  maxLane: 0,
  minWorldY: 0,
  maxWorldY: 0,
  minWorldX: 0,
  maxWorldX: 0,
};
const footprintScratchC: SpawnFootprint = {
  minLane: 0,
  maxLane: 0,
  minWorldY: 0,
  maxWorldY: 0,
  minWorldX: 0,
  maxWorldX: 0,
};
const patternFootprintScratch: SpawnFootprint = {
  minLane: 0,
  maxLane: 0,
  minWorldY: 0,
  maxWorldY: 0,
  minWorldX: 0,
  maxWorldX: 0,
};
const patternEntryScratch: SpawnFootprint = {
  minLane: 0,
  maxLane: 0,
  minWorldY: 0,
  maxWorldY: 0,
  minWorldX: 0,
  maxWorldX: 0,
};

function mergeFootprint(target: SpawnFootprint, next: SpawnFootprint): void {
  if (next.minLane < target.minLane) {
    target.minLane = next.minLane;
  }
  if (next.maxLane > target.maxLane) {
    target.maxLane = next.maxLane;
  }
  if (next.minWorldY < target.minWorldY) {
    target.minWorldY = next.minWorldY;
  }
  if (next.maxWorldY > target.maxWorldY) {
    target.maxWorldY = next.maxWorldY;
  }
  if (next.minWorldX < target.minWorldX) {
    target.minWorldX = next.minWorldX;
  }
  if (next.maxWorldX > target.maxWorldX) {
    target.maxWorldX = next.maxWorldX;
  }
}

function writeFootprintFromCenter(
  out: SpawnFootprint,
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  laneIndex: number,
): void {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  out.minLane = laneIndex;
  out.maxLane = laneIndex;
  out.minWorldY = worldY - halfH;
  out.maxWorldY = worldY + halfH;
  out.minWorldX = worldX - halfW;
  out.maxWorldX = worldX + halfW;
}

function footprintFromCenter(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  laneIndex: number,
): SpawnFootprint {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  return {
    minLane: laneIndex,
    maxLane: laneIndex,
    minWorldY: worldY - halfH,
    maxWorldY: worldY + halfH,
    minWorldX: worldX - halfW,
    maxWorldX: worldX + halfW,
  };
}

function copyFootprint(source: SpawnFootprint): SpawnFootprint {
  return {
    minLane: source.minLane,
    maxLane: source.maxLane,
    minWorldY: source.minWorldY,
    maxWorldY: source.maxWorldY,
    minWorldX: source.minWorldX,
    maxWorldX: source.maxWorldX,
  };
}

function resolveObstacleVariantDimensions(variant: ObstacleVariant): { width: number; height: number } {
  return OBSTACLE_VARIANT_DIMENSIONS[variant];
}

export function footprintsOverlap(a: SpawnFootprint, b: SpawnFootprint): boolean {
  return (
    a.minWorldX <= b.maxWorldX &&
    a.maxWorldX >= b.minWorldX &&
    a.minWorldY <= b.maxWorldY &&
    a.maxWorldY >= b.minWorldY
  );
}

function writePickupRequestFootprint(out: SpawnFootprint, request: SpawnRequest): boolean {
  if (request.kind !== 'coin' && request.kind !== 'shield' && request.kind !== 'speed_boost') {
    return false;
  }
  const size =
    request.kind === 'coin'
      ? COIN_WORLD_SIZE
      : request.kind === 'shield'
        ? SHIELD_WORLD_SIZE
        : SPEED_BOOST_WORLD_SIZE;
  writeFootprintFromCenter(out, request.worldX, request.worldY, size.width, size.height, request.laneIndex);
  return true;
}

function writeObstacleRequestFootprint(out: SpawnFootprint, request: SpawnRequest): boolean {
  if (request.kind !== 'obstacle') {
    return false;
  }
  const variant = request.obstacleVariant ?? 'small_rock';
  const dimensions = resolveObstacleVariantDimensions(variant);
  writeFootprintFromCenter(
    out,
    request.worldX,
    request.worldY,
    dimensions.width,
    dimensions.height,
    request.laneIndex,
  );
  return true;
}

function writePatternFootprint(
  out: SpawnFootprint,
  pattern: SpawnPattern,
  originY: number,
  centerLaneIndex: number,
  laneCount: number,
  laneWidth: number,
  playableOriginX: number,
): void {
  const obstacles = pattern.obstacles;
  let hasMerged = false;

  for (let index = 0; index < obstacles.length; index += 1) {
    const entry = obstacles[index];
    const laneIndex = resolvePatternLaneIndex(centerLaneIndex, entry.laneOffset, laneCount);
    const worldX = resolvePatternWorldX(playableOriginX, laneWidth, laneIndex);
    const worldY = originY - entry.forwardOffset;
    const dimensions = resolveObstacleVariantDimensions(entry.variant);
    writeFootprintFromCenter(
      patternEntryScratch,
      worldX,
      worldY,
      dimensions.width,
      dimensions.height,
      laneIndex,
    );
    if (!hasMerged) {
      out.minLane = patternEntryScratch.minLane;
      out.maxLane = patternEntryScratch.maxLane;
      out.minWorldY = patternEntryScratch.minWorldY;
      out.maxWorldY = patternEntryScratch.maxWorldY;
      out.minWorldX = patternEntryScratch.minWorldX;
      out.maxWorldX = patternEntryScratch.maxWorldX;
      hasMerged = true;
    } else {
      mergeFootprint(out, patternEntryScratch);
    }
  }

  if (!hasMerged) {
    out.minLane = centerLaneIndex;
    out.maxLane = centerLaneIndex;
    out.minWorldY = originY;
    out.maxWorldY = originY;
    out.minWorldX = playableOriginX;
    out.maxWorldX = playableOriginX;
  }
}

export function calculatePatternFootprint(
  pattern: SpawnPattern,
  originY: number,
  centerLaneIndex: number,
  laneCount: number,
  laneWidth: number,
  playableOriginX: number,
): SpawnFootprint {
  writePatternFootprint(
    patternFootprintScratch,
    pattern,
    originY,
    centerLaneIndex,
    laneCount,
    laneWidth,
    playableOriginX,
  );
  // Public API: return a copy so callers may retain the result across calls.
  return copyFootprint(patternFootprintScratch);
}

export function createPickupSpawnFootprint(
  worldX: number,
  worldY: number,
  laneIndex: number,
  kind: 'coin' | 'shield' | 'speed_boost',
): SpawnFootprint {
  const size =
    kind === 'coin'
      ? COIN_WORLD_SIZE
      : kind === 'shield'
        ? SHIELD_WORLD_SIZE
        : SPEED_BOOST_WORLD_SIZE;

  return footprintFromCenter(worldX, worldY, size.width, size.height, laneIndex);
}

export function createDecorativeTreeFootprint(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
): SpawnFootprint {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  return {
    minLane: -1,
    maxLane: -1,
    minWorldY: worldY - halfH,
    maxWorldY: worldY + halfH,
    minWorldX: worldX - halfW,
    maxWorldX: worldX + halfW,
  };
}

/** Pickup placement: live obstacles only (pending obstacle rows over-block the queue). */
export function isActiveObstacleAreaOccupied(
  footprint: SpawnFootprint,
  obstaclePool: ObstaclePoolState,
): boolean {
  const obstacles = obstaclePool.obstacles;
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active) {
      continue;
    }

    // Cheap vertical reject before writing footprint scratch.
    if (obstacle.worldY + obstacle.height * 0.5 < footprint.minWorldY) {
      continue;
    }
    if (obstacle.worldY - obstacle.height * 0.5 > footprint.maxWorldY) {
      continue;
    }

    writeFootprintFromCenter(
      footprintScratchB,
      obstacle.worldX,
      obstacle.worldY,
      obstacle.width,
      obstacle.height,
      obstacle.laneIndex,
    );
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  return false;
}

export function isSpawnAreaOccupied(
  footprint: SpawnFootprint,
  obstaclePool: ObstaclePoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): boolean {
  if (isActiveObstacleAreaOccupied(footprint, obstaclePool)) {
    return true;
  }

  const cappedPending = pendingCount < pendingRequests.length ? pendingCount : pendingRequests.length;
  for (let index = 0; index < cappedPending; index += 1) {
    const request = pendingRequests[index];
    if (!writeObstacleRequestFootprint(footprintScratchB, request)) {
      continue;
    }
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  return false;
}

/** Obstacle pattern placement: active pickup pools and pending pickup requests. */
export function isPickupAreaOccupied(
  footprint: SpawnFootprint,
  coinPool: CoinPoolState,
  shieldPool: ShieldPoolState,
  speedBoostPool: SpeedBoostPoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): boolean {
  const coins = coinPool.coins;
  for (let index = 0; index < coins.length; index += 1) {
    const coin = coins[index];
    if (!coin.active) {
      continue;
    }
    writeFootprintFromCenter(
      footprintScratchB,
      coin.worldX,
      coin.worldY,
      coin.width,
      coin.height,
      coin.laneIndex,
    );
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  const shields = shieldPool.shields;
  for (let index = 0; index < shields.length; index += 1) {
    const shield = shields[index];
    if (!shield.active) {
      continue;
    }
    writeFootprintFromCenter(
      footprintScratchB,
      shield.worldX,
      shield.worldY,
      shield.width,
      shield.height,
      shield.laneIndex,
    );
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  const speedBoosts = speedBoostPool.speedBoosts;
  for (let index = 0; index < speedBoosts.length; index += 1) {
    const speedBoost = speedBoosts[index];
    if (!speedBoost.active) {
      continue;
    }
    writeFootprintFromCenter(
      footprintScratchB,
      speedBoost.worldX,
      speedBoost.worldY,
      speedBoost.width,
      speedBoost.height,
      speedBoost.laneIndex,
    );
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  const cappedPending = pendingCount < pendingRequests.length ? pendingCount : pendingRequests.length;
  for (let index = 0; index < cappedPending; index += 1) {
    const request = pendingRequests[index];
    if (!writePickupRequestFootprint(footprintScratchB, request)) {
      continue;
    }
    if (footprintsOverlap(footprint, footprintScratchB)) {
      return true;
    }
  }

  return false;
}

export type PickupSpawnKind = 'coin' | 'shield' | 'speed_boost';

function writeExpandedFootprintInsets(
  out: SpawnFootprint,
  footprint: SpawnFootprint,
  insetPx: number,
): void {
  out.minLane = footprint.minLane;
  out.maxLane = footprint.maxLane;
  out.minWorldY = footprint.minWorldY - insetPx;
  out.maxWorldY = footprint.maxWorldY + insetPx;
  out.minWorldX = footprint.minWorldX - insetPx;
  out.maxWorldX = footprint.maxWorldX + insetPx;
}

function isPickupSpawnBlockedByObstacles(
  footprint: SpawnFootprint,
  kind: PickupSpawnKind,
  obstaclePool: ObstaclePoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): boolean {
  const clearance =
    kind === 'shield' ? GAME_CONFIG.SHIELD_PICKUP_SPAWN_CLEARANCE : 0;

  if (clearance > 0) {
    writeExpandedFootprintInsets(footprintScratchC, footprint, clearance);
    if (kind === 'shield') {
      return isSpawnAreaOccupied(footprintScratchC, obstaclePool, pendingRequests, pendingCount);
    }
    return isActiveObstacleAreaOccupied(footprintScratchC, obstaclePool);
  }

  if (kind === 'shield') {
    return isSpawnAreaOccupied(footprint, obstaclePool, pendingRequests, pendingCount);
  }

  return isActiveObstacleAreaOccupied(footprint, obstaclePool);
}

/** After intake, re-check active obstacles (e.g. rocks spawned same frame as enqueue). */
export function nudgeShieldWorldYClearOfActiveObstacles(
  obstaclePool: ObstaclePoolState,
  worldX: number,
  worldY: number,
  laneIndex: number,
): number {
  const { SPAWN_PICKUP_WORLD_Y_RETRY_STEP, SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS } = GAME_CONFIG;
  let candidateY = worldY;
  const clearance = GAME_CONFIG.SHIELD_PICKUP_SPAWN_CLEARANCE;

  for (let attempt = 0; attempt < SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS; attempt += 1) {
    writeFootprintFromCenter(
      footprintScratchA,
      worldX,
      candidateY,
      SHIELD_WORLD_SIZE.width,
      SHIELD_WORLD_SIZE.height,
      laneIndex,
    );
    writeExpandedFootprintInsets(footprintScratchC, footprintScratchA, clearance);
    if (!isActiveObstacleAreaOccupied(footprintScratchC, obstaclePool)) {
      return candidateY;
    }
    candidateY += SPAWN_PICKUP_WORLD_Y_RETRY_STEP;
  }

  return worldY;
}

export function isShieldPickupBlockedByActiveObstacles(
  obstaclePool: ObstaclePoolState,
  worldX: number,
  worldY: number,
  laneIndex: number,
): boolean {
  writeFootprintFromCenter(
    footprintScratchA,
    worldX,
    worldY,
    SHIELD_WORLD_SIZE.width,
    SHIELD_WORLD_SIZE.height,
    laneIndex,
  );
  writeExpandedFootprintInsets(
    footprintScratchC,
    footprintScratchA,
    GAME_CONFIG.SHIELD_PICKUP_SPAWN_CLEARANCE,
  );
  return isActiveObstacleAreaOccupied(footprintScratchC, obstaclePool);
}

function isPickupWorldYTooClose(candidateWorldY: number, otherWorldY: number): boolean {
  const delta = candidateWorldY - otherWorldY;
  const distance = delta < 0 ? -delta : delta;
  return distance < GAME_CONFIG.PICKUP_MIN_VERTICAL_SEPARATION;
}

/**
 * Rejects candidates whose worldY is too close to any pending or active pickup.
 * Solves same-tick coin → speed_boost sharing `baseWorldY` without a fixed offset pattern.
 */
export function isPickupVerticalSeparationBlocked(
  candidateWorldY: number,
  coinPool: CoinPoolState,
  shieldPool: ShieldPoolState,
  speedBoostPool: SpeedBoostPoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): boolean {
  const cappedPending =
    pendingCount < pendingRequests.length ? pendingCount : pendingRequests.length;
  for (let index = 0; index < cappedPending; index += 1) {
    const request = pendingRequests[index];
    if (
      request.kind !== 'coin' &&
      request.kind !== 'shield' &&
      request.kind !== 'speed_boost'
    ) {
      continue;
    }
    if (isPickupWorldYTooClose(candidateWorldY, request.worldY)) {
      return true;
    }
  }

  const coins = coinPool.coins;
  for (let index = 0; index < coins.length; index += 1) {
    const coin = coins[index];
    if (!coin.active) {
      continue;
    }
    if (isPickupWorldYTooClose(candidateWorldY, coin.worldY)) {
      return true;
    }
  }

  const shields = shieldPool.shields;
  for (let index = 0; index < shields.length; index += 1) {
    const shield = shields[index];
    if (!shield.active) {
      continue;
    }
    if (isPickupWorldYTooClose(candidateWorldY, shield.worldY)) {
      return true;
    }
  }

  const speedBoosts = speedBoostPool.speedBoosts;
  for (let index = 0; index < speedBoosts.length; index += 1) {
    const speedBoost = speedBoosts[index];
    if (!speedBoost.active) {
      continue;
    }
    if (isPickupWorldYTooClose(candidateWorldY, speedBoost.worldY)) {
      return true;
    }
  }

  return false;
}

export function findClearPatternOriginY(
  pattern: SpawnPattern,
  startOriginY: number,
  centerLaneIndex: number,
  spawnLayout: {
    laneCount: number;
    laneWidth: number;
    playableOriginX: number;
  },
  obstaclePool: ObstaclePoolState,
  coinPool: CoinPoolState,
  shieldPool: ShieldPoolState,
  speedBoostPool: SpeedBoostPoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): number {
  const { SPAWN_VALIDATION_PATTERN_MAX_RETRIES, PATTERN_VERTICAL_SPACING_MIN } = GAME_CONFIG;
  let originY = startOriginY;
  let retries = 0;

  while (retries <= SPAWN_VALIDATION_PATTERN_MAX_RETRIES) {
    writePatternFootprint(
      patternFootprintScratch,
      pattern,
      originY,
      centerLaneIndex,
      spawnLayout.laneCount,
      spawnLayout.laneWidth,
      spawnLayout.playableOriginX,
    );
    if (
      !isSpawnAreaOccupied(
        patternFootprintScratch,
        obstaclePool,
        pendingRequests,
        pendingCount,
      ) &&
      !isPickupAreaOccupied(
        patternFootprintScratch,
        coinPool,
        shieldPool,
        speedBoostPool,
        pendingRequests,
        pendingCount,
      )
    ) {
      return originY;
    }
    originY += PATTERN_VERTICAL_SPACING_MIN;
    retries += 1;
    if (retries <= SPAWN_VALIDATION_PATTERN_MAX_RETRIES) {
      profileSpawnValidationRetry();
    }
  }

  profileSpawnRejected();
  return Number.NaN;
}

export function findClearPickupSpawn(
  baseWorldY: number,
  startLaneIndex: number,
  laneCount: number,
  laneWidth: number,
  playableOriginX: number,
  kind: PickupSpawnKind,
  obstaclePool: ObstaclePoolState,
  coinPool: CoinPoolState,
  shieldPool: ShieldPoolState,
  speedBoostPool: SpeedBoostPoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): { worldX: number; worldY: number; laneIndex: number } | null {
  const {
    SPAWN_PICKUP_WORLD_Y_RETRY_STEP,
    SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS,
    SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS,
  } = GAME_CONFIG;

  if (laneCount <= 0) {
    return null;
  }

  const size =
    kind === 'coin'
      ? COIN_WORLD_SIZE
      : kind === 'shield'
        ? SHIELD_WORLD_SIZE
        : SPEED_BOOST_WORLD_SIZE;

  let probes = 0;
  const yBandLimit =
    SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS > 0 ? SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS : 1;

  for (let yBand = 0; yBand < yBandLimit; yBand += 1) {
    if (yBand > 0) {
      profileSpawnValidationRetry();
    }
    const worldY = baseWorldY + yBand * SPAWN_PICKUP_WORLD_Y_RETRY_STEP;

    if (
      isPickupVerticalSeparationBlocked(
        worldY,
        coinPool,
        shieldPool,
        speedBoostPool,
        pendingRequests,
        pendingCount,
      )
    ) {
      continue;
    }

    for (let laneOffset = 0; laneOffset < laneCount; laneOffset += 1) {
      if (probes >= SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS) {
        profileSpawnRejected();
        return null;
      }
      probes += 1;
      if (probes > 1) {
        profileSpawnValidationRetry();
      }

      const laneIndex = (startLaneIndex + laneOffset) % laneCount;
      const worldX = resolvePatternWorldX(playableOriginX, laneWidth, laneIndex);
      writeFootprintFromCenter(
        footprintScratchA,
        worldX,
        worldY,
        size.width,
        size.height,
        laneIndex,
      );

      if (
        !isPickupSpawnBlockedByObstacles(
          footprintScratchA,
          kind,
          obstaclePool,
          pendingRequests,
          pendingCount,
        )
      ) {
        return { worldX, worldY, laneIndex };
      }
    }
  }

  profileSpawnRejected();
  return null;
}
