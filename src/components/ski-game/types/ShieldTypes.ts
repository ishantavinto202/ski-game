export type ShieldRecord = {
  id: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  active: boolean;
  spawnRequestId: number;
  laneIndex: number;
};

export type ShieldPoolState = {
  shields: ShieldRecord[];
  activeCount: number;
  nextShieldId: number;
  isShieldActive: boolean;
  remainingShieldMs: number;
};

export const SHIELD_WORLD_SIZE = {
  width: 32,
  height: 32,
} as const;

export function createInactiveShieldRecord(): ShieldRecord {
  return {
    id: 0,
    worldX: 0,
    worldY: 0,
    width: SHIELD_WORLD_SIZE.width,
    height: SHIELD_WORLD_SIZE.height,
    active: false,
    spawnRequestId: 0,
    laneIndex: 0,
  };
}

export function createInitialShieldPoolState(): ShieldPoolState {
  return {
    shields: [],
    activeCount: 0,
    nextShieldId: 1,
    isShieldActive: false,
    remainingShieldMs: 0,
  };
}
