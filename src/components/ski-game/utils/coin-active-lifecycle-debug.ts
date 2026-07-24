import { coinWorldToScreenRect } from '../entities/Coin';
import type { GameEngine } from '../engine/GameEngine';
import type { CoinRecord } from '../types/CoinTypes';
import { isCoinRectVisible, getCoinRenderMargin } from './coin-render';
import { worldYCenterToScreenY, screenYToWorldY } from './world-coordinates';
import { GAME_CONFIG } from './GameConfig';

/** Temporary — tracks active coins vs player until collected/despawned/deactivated. */
export const COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED = false;

const LOG_INTERVAL_MS = 1000;

type TrackedCoin = {
  requestId: number;
  coinId: number;
  poolIndex: number;
  nextLogAtMs: number;
};

const trackedByPoolIndex = new Map<number, TrackedCoin>();

function resolvePlayerCenterWorldY(engine: GameEngine): number {
  const player = engine.playerRef.current;
  const viewport = engine.viewportRef.current;
  if (!player || !viewport) {
    return Number.NaN;
  }

  const playerCenterScreenY = player.y + player.height * 0.5;
  return screenYToWorldY(engine, playerCenterScreenY);
}

function isCoinStillActive(engine: GameEngine, poolIndex: number, coinId: number): boolean {
  const coin = engine.coinRef.current.coins[poolIndex];
  return coin.active && coin.id === coinId;
}

export function resetCoinActiveLifecycleDebug(): void {
  trackedByPoolIndex.clear();
}

export function registerCoinActivatedForLifecycleDebug(
  engine: GameEngine,
  poolIndex: number,
  coin: CoinRecord,
): void {
  if (!COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED) {
    return;
  }

  const elapsedMs = engine.timeRef.current.elapsedMs;
  trackedByPoolIndex.set(poolIndex, {
    requestId: coin.spawnRequestId,
    coinId: coin.id,
    poolIndex,
    nextLogAtMs: elapsedMs,
  });

  logActiveCoinSnapshot(engine, poolIndex, coin, 'activated');
}

export function unregisterCoinLifecycleDebug(poolIndex: number, reason: string, coinId: number): void {
  if (!COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED) {
    return;
  }

  const tracked = trackedByPoolIndex.get(poolIndex);
  if (tracked && tracked.coinId === coinId) {
    trackedByPoolIndex.delete(poolIndex);
    console.log('[COIN LIFECYCLE] stopped tracking', { poolIndex, coinId, reason });
  }
}

function logActiveCoinSnapshot(
  engine: GameEngine,
  poolIndex: number,
  coin: CoinRecord,
  tag: string,
): void {
  const viewport = engine.viewportRef.current;
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const cameraOffsetX = engine.cameraRef.current.offsetX;
  const playerWorldY = resolvePlayerCenterWorldY(engine);

  const screenY = worldYCenterToScreenY(scrollOffsetY, coin.worldY);
  const rect = coinWorldToScreenRect(coin, scrollOffsetY, cameraOffsetX);
  const margin = viewport ? getCoinRenderMargin() : 0;
  const visibleOnScreen = viewport ? isCoinRectVisible(rect, viewport, margin) : false;

  const despawnScreenY =
    viewport !== null ? viewport.height + GAME_CONFIG.COIN_DESPAWN_MARGIN : Number.NaN;
  const pastDespawnLine = viewport !== null && screenY > despawnScreenY;

  console.log('[COIN LIFECYCLE]', tag, {
    requestId: coin.spawnRequestId,
    coinId: coin.id,
    poolIndex,
    playerWorldY,
    coinWorldY: coin.worldY,
    deltaWorldY: Number.isFinite(playerWorldY) ? coin.worldY - playerWorldY : Number.NaN,
    screenY,
    scrollOffsetY,
    visibleOnScreen,
    pastDespawnLine,
    despawnScreenY,
    rectTop: rect.top,
    rectLeft: rect.left,
  });
}

export function tickCoinActiveLifecycleDebug(engine: GameEngine): void {
  if (!COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED) {
    return;
  }

  const elapsedMs = engine.timeRef.current.elapsedMs;
  const entries = [...trackedByPoolIndex.values()];

  for (let index = 0; index < entries.length; index += 1) {
    const tracked = entries[index];
    if (elapsedMs < tracked.nextLogAtMs) {
      continue;
    }

    if (!isCoinStillActive(engine, tracked.poolIndex, tracked.coinId)) {
      trackedByPoolIndex.delete(tracked.poolIndex);
      continue;
    }

    const coin = engine.coinRef.current.coins[tracked.poolIndex];
    logActiveCoinSnapshot(engine, tracked.poolIndex, coin, 'tick');
    tracked.nextLogAtMs = elapsedMs + LOG_INTERVAL_MS;
    trackedByPoolIndex.set(tracked.poolIndex, tracked);
  }
}
