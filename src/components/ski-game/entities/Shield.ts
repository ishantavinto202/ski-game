import { GAME_CONFIG } from '../utils/GameConfig';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

import {
  createInactiveShieldRecord,
  createInitialShieldPoolState,
  SHIELD_WORLD_SIZE,
  type ShieldPoolState,
  type ShieldRecord,
} from '../types/ShieldTypes';

export type ShieldScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createShieldPoolState(): ShieldPoolState {
  const maxShields = GAME_CONFIG.MAX_SHIELDS;
  const state = createInitialShieldPoolState();
  const shields: ShieldRecord[] = new Array(maxShields);
  for (let index = 0; index < maxShields; index += 1) {
    shields[index] = createInactiveShieldRecord();
  }
  state.shields = shields;
  return state;
}

export function findInactiveShieldSlot(pool: ShieldPoolState): ShieldRecord | null {
  const shields = pool.shields;
  for (let index = 0; index < shields.length; index += 1) {
    if (!shields[index].active) {
      return shields[index];
    }
  }
  return null;
}

export function shieldWorldToScreenRect(
  shield: ShieldRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): ShieldScreenRect {
  return {
    left: shield.worldX - shield.width * 0.5 - cameraOffsetX,
    top: worldYCenterToScreenY(scrollOffsetY, shield.worldY) - shield.height * 0.5,
    width: shield.width,
    height: shield.height,
  };
}

export function activateShieldFromSpawn(
  slot: ShieldRecord,
  pool: ShieldPoolState,
  params: {
    worldX: number;
    worldY: number;
    spawnRequestId: number;
    laneIndex: number;
  },
): void {
  slot.id = pool.nextShieldId;
  pool.nextShieldId += 1;
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = SHIELD_WORLD_SIZE.width;
  slot.height = SHIELD_WORLD_SIZE.height;
  slot.spawnRequestId = params.spawnRequestId;
  slot.laneIndex = params.laneIndex;
  slot.active = true;

  pool.activeCount += 1;
}

export function deactivateShield(slot: ShieldRecord, pool: ShieldPoolState): void {
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

export function activateShieldEffect(pool: ShieldPoolState): void {
  pool.isShieldActive = true;
  pool.remainingShieldMs = GAME_CONFIG.SHIELD_DURATION_MS;
}

export function consumeShieldEffect(pool: ShieldPoolState): void {
  pool.isShieldActive = false;
  pool.remainingShieldMs = 0;
}

export function collectShieldPickup(slot: ShieldRecord, pool: ShieldPoolState): void {
  if (!slot.active) {
    return;
  }

  deactivateShield(slot, pool);
  activateShieldEffect(pool);
}

export function tickShieldDuration(pool: ShieldPoolState, fixedDeltaMs: number): void {
  if (!pool.isShieldActive) {
    return;
  }

  pool.remainingShieldMs -= fixedDeltaMs;
  if (pool.remainingShieldMs <= 0) {
    consumeShieldEffect(pool);
  }
}
