import { GAME_CONFIG } from '../utils/GameConfig';
import { profilePickupSpawn } from '../profiling/PerformanceProfiling';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

import {
  COIN_WORLD_SIZE,
  createInactiveCoinRecord,
  type CoinPoolState,
  type CoinRecord,
} from '../types/CoinTypes';

export type CoinScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function createCoinPoolState(): CoinPoolState {
  const maxCoins = GAME_CONFIG.MAX_COINS;
  const coins: CoinRecord[] = new Array(maxCoins);
  for (let index = 0; index < maxCoins; index += 1) {
    coins[index] = createInactiveCoinRecord();
  }

  return {
    coins,
    activeCount: 0,
    totalCoinsCollected: 0,
    nextCoinId: 1,
  };
}

export function findInactiveCoinSlot(pool: CoinPoolState): CoinRecord | null {
  const coins = pool.coins;
  for (let index = 0; index < coins.length; index += 1) {
    if (!coins[index].active) {
      return coins[index];
    }
  }
  return null;
}

export function coinWorldToScreenRect(
  coin: CoinRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): CoinScreenRect {
  return {
    left: coin.worldX - coin.width * 0.5 - cameraOffsetX,
    top: worldYCenterToScreenY(scrollOffsetY, coin.worldY) - coin.height * 0.5,
    width: coin.width,
    height: coin.height,
  };
}

export function activateCoinFromSpawn(
  slot: CoinRecord,
  pool: CoinPoolState,
  params: {
    worldX: number;
    worldY: number;
    spawnRequestId: number;
    laneIndex: number;
  },
): void {
  slot.id = pool.nextCoinId;
  pool.nextCoinId += 1;
  slot.worldX = params.worldX;
  slot.worldY = params.worldY;
  slot.width = COIN_WORLD_SIZE.width;
  slot.height = COIN_WORLD_SIZE.height;
  slot.spawnRequestId = params.spawnRequestId;
  slot.laneIndex = params.laneIndex;
  slot.active = true;

  pool.activeCount += 1;
  profilePickupSpawn();
}

export function deactivateCoin(slot: CoinRecord, pool: CoinPoolState): void {
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

export function collectCoin(slot: CoinRecord, pool: CoinPoolState): void {
  if (!slot.active) {
    return;
  }

  deactivateCoin(slot, pool);
  pool.totalCoinsCollected += 1;
}
