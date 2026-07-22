export type SpeedBoostRecord = {
  id: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  active: boolean;
  spawnRequestId: number;
  laneIndex: number;
};

export type SpeedBoostPoolState = {
  speedBoosts: SpeedBoostRecord[];
  activeCount: number;
  nextSpeedBoostId: number;
  isSpeedBoostActive: boolean;
  remainingSpeedBoostMs: number;
  speedMultiplier: number;
};

export const SPEED_BOOST_WORLD_SIZE = {
  width: 32,
  height: 32,
} as const;

export function createInactiveSpeedBoostRecord(): SpeedBoostRecord {
  return {
    id: 0,
    worldX: 0,
    worldY: 0,
    width: SPEED_BOOST_WORLD_SIZE.width,
    height: SPEED_BOOST_WORLD_SIZE.height,
    active: false,
    spawnRequestId: 0,
    laneIndex: 0,
  };
}

export function createInitialSpeedBoostPoolState(): SpeedBoostPoolState {
  return {
    speedBoosts: [],
    activeCount: 0,
    nextSpeedBoostId: 1,
    isSpeedBoostActive: false,
    remainingSpeedBoostMs: 0,
    speedMultiplier: 1,
  };
}
