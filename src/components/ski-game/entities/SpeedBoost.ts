import { GAME_CONFIG } from '../utils/GameConfig';
import { profilePickupSpawn } from '../profiling/PerformanceProfiling';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

import {
  createInactiveSpeedBoostRecord,
  createInitialSpeedBoostPoolState,
  SPEED_BOOST_WORLD_SIZE,
  type SpeedBoostPoolState,
  type SpeedBoostRecord,
} from '../types/SpeedBoostTypes';

export type SpeedBoostScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createSpeedBoostPoolState(): SpeedBoostPoolState {
  const maxSpeedBoosts = GAME_CONFIG.MAX_SPEED_BOOSTS;
  const state = createInitialSpeedBoostPoolState();
  const speedBoosts: SpeedBoostRecord[] = new Array(maxSpeedBoosts);
  for (let index = 0; index < maxSpeedBoosts; index += 1) {
    speedBoosts[index] = createInactiveSpeedBoostRecord();
  }
  state.speedBoosts = speedBoosts;
  return state;
}

export function findInactiveSpeedBoostSlot(pool: SpeedBoostPoolState): SpeedBoostRecord | null {
  const speedBoosts = pool.speedBoosts;
  for (let index = 0; index < speedBoosts.length; index += 1) {
    if (!speedBoosts[index].active) {
      return speedBoosts[index];
    }
  }
  return null;
}

export function speedBoostWorldToScreenRect(
  speedBoost: SpeedBoostRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): SpeedBoostScreenRect {
  return {
    left: speedBoost.worldX - speedBoost.width * 0.5 - cameraOffsetX,
    top: worldYCenterToScreenY(scrollOffsetY, speedBoost.worldY) - speedBoost.height * 0.5,
    width: speedBoost.width,
    height: speedBoost.height,
  };
}

export function activateSpeedBoostFromSpawn(
  slot: SpeedBoostRecord,
  pool: SpeedBoostPoolState,
  params: {
    worldX: number;
    worldY: number;
    spawnRequestId: number;
    laneIndex: number;
  },
): void {
  slot.id = pool.nextSpeedBoostId;
  pool.nextSpeedBoostId += 1;
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = SPEED_BOOST_WORLD_SIZE.width;
  slot.height = SPEED_BOOST_WORLD_SIZE.height;
  slot.spawnRequestId = params.spawnRequestId;
  slot.laneIndex = params.laneIndex;
  slot.active = true;

  pool.activeCount += 1;
  profilePickupSpawn();
}

export function deactivateSpeedBoost(slot: SpeedBoostRecord, pool: SpeedBoostPoolState): void {
  if (!slot.active) {
    return;
  }

  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  pool.activeCount -= 1;
  if (pool.activeCount < 0) {
    pool.activeCount = 0;
  }
}

export function activateSpeedBoostEffect(pool: SpeedBoostPoolState): void {
  pool.isSpeedBoostActive = true;
  pool.remainingSpeedBoostMs = GAME_CONFIG.SPEED_BOOST_DURATION_MS;
  pool.speedMultiplier = GAME_CONFIG.SPEED_BOOST_MULTIPLIER;
}

export function collectSpeedBoostPickup(slot: SpeedBoostRecord, pool: SpeedBoostPoolState): void {
  if (!slot.active) {
    return;
  }

  deactivateSpeedBoost(slot, pool);
  activateSpeedBoostEffect(pool);
}

export function tickSpeedBoostDuration(pool: SpeedBoostPoolState, fixedDeltaMs: number): void {
  if (!pool.isSpeedBoostActive) {
    return;
  }

  pool.remainingSpeedBoostMs -= fixedDeltaMs;
  if (pool.remainingSpeedBoostMs <= 0) {
    pool.remainingSpeedBoostMs = 0;
    pool.isSpeedBoostActive = false;
    pool.speedMultiplier = 1;
  }
}

export function resolveScrollSpeedMultiplier(pool: SpeedBoostPoolState): number {
  if (!pool.isSpeedBoostActive) {
    return 1;
  }
  return pool.speedMultiplier;
}
