export type CoinRecord = {
  id: number;
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  active: boolean;
  spawnRequestId: number;
  laneIndex: number;
};

export type CoinPoolState = {
  coins: CoinRecord[];
  activeCount: number;
  totalCoinsCollected: number;
  nextCoinId: number;
};

export const COIN_WORLD_SIZE = {
  width: 28,
  height: 28,
} as const;

export function createInactiveCoinRecord(): CoinRecord {
  return {
    id: 0,
    worldX: 0,
    worldY: 0,
    width: COIN_WORLD_SIZE.width,
    height: COIN_WORLD_SIZE.height,
    active: false,
    spawnRequestId: 0,
    laneIndex: 0,
  };
}
