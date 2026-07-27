import { GAME_CONFIG } from '../utils/GameConfig';
import { worldYCenterToScreenY } from '../utils/world-coordinates';
import type {
  SnowSurfacePoolState,
  SnowSurfaceRecord,
  SnowSurfaceTypeIndex,
} from '../types/SnowSurfaceTypes';

export type SnowSurfaceScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createInactiveSnowSurfaceRecord(): SnowSurfaceRecord {
  return {
    worldX: 0,
    worldY: 0,
    width: 0,
    height: 0,
    typeIndex: 0,
    active: false,
  };
}

export function createSnowSurfacePoolState(): SnowSurfacePoolState {
  const maxDetails = GAME_CONFIG.MAX_SNOW_SURFACE_DETAILS;
  const details: SnowSurfaceRecord[] = new Array(maxDetails);
  for (let index = 0; index < maxDetails; index += 1) {
    details[index] = createInactiveSnowSurfaceRecord();
  }

  return {
    details,
    activeCount: 0,
    nextWorldY: 0,
    fillInitialized: false,
    rngState: 0xa5f1c3e9,
  };
}

export function findInactiveSnowSurfaceSlot(
  pool: SnowSurfacePoolState,
): SnowSurfaceRecord | null {
  const details = pool.details;
  for (let index = 0; index < details.length; index += 1) {
    if (!details[index].active) {
      return details[index];
    }
  }
  return null;
}

export function activateSnowSurface(
  slot: SnowSurfaceRecord,
  pool: SnowSurfacePoolState,
  params: {
    worldX: number;
    worldY: number;
    width: number;
    height: number;
    typeIndex: SnowSurfaceTypeIndex;
  },
): void {
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = params.width;
  slot.height = params.height;
  slot.typeIndex = params.typeIndex;
  slot.active = true;
  pool.activeCount += 1;
}

export function deactivateSnowSurface(slot: SnowSurfaceRecord, pool: SnowSurfacePoolState): void {
  if (!slot.active) {
    return;
  }
  slot.active = false;
  pool.activeCount -= 1;
  if (pool.activeCount < 0) {
    pool.activeCount = 0;
  }
}

export function snowSurfaceWorldToScreenRect(
  detail: SnowSurfaceRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): SnowSurfaceScreenRect {
  return {
    left: detail.worldX - detail.width * 0.5 - cameraOffsetX,
    top: worldYCenterToScreenY(scrollOffsetY, detail.worldY) - detail.height * 0.5,
    width: detail.width,
    height: detail.height,
  };
}

export function resetSnowSurfaceSlotInPlace(slot: SnowSurfaceRecord): void {
  slot.active = false;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.width = 0;
  slot.height = 0;
  slot.typeIndex = 0;
}

export function resetSnowSurfacePoolInPlace(pool: SnowSurfacePoolState): void {
  const details = pool.details;
  for (let index = 0; index < details.length; index += 1) {
    resetSnowSurfaceSlotInPlace(details[index]);
  }
  pool.activeCount = 0;
  pool.nextWorldY = 0;
  pool.fillInitialized = false;
  pool.rngState = 0xa5f1c3e9;
}
