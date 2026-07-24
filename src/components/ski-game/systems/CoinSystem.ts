import {
  activateCoinFromSpawn,
  coinWorldToScreenRect,
  collectCoin,
  createCoinPoolState,
  deactivateCoin,
} from '../entities/Coin';
import type { GameEngine } from '../engine/GameEngine';
import type { SpawnRequest } from '../types/SpawnTypes';
import type { GameSystem } from '../types';
import { aabbIntersectsWithPadding } from '../utils/collision';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  isSpawnRequestPastDespawn,
  copySpawnRequestToWriteIndex,
  retainFailedSpawnRequest,
} from '../utils/spawn-request-intake';
import {
  logCoinActivated,
  logCoinCollected,
  logCoinDespawned,
  logCoinRetained,
  logCoinStaleDropped,
  logCoinSystemReceivedRequest,
} from '../utils/coin-scheduling-debug';
import {
  registerCoinActivatedForLifecycleDebug,
  resetCoinActiveLifecycleDebug,
  tickCoinActiveLifecycleDebug,
  unregisterCoinLifecycleDebug,
} from '../utils/coin-active-lifecycle-debug';
import { resolveCoinActivationWorldY } from '../utils/coin-activation-world-y';
import { spawnGameplayFeedbackForCoinCollect } from '../effects/GameplayFeedback';
import { COIN_COLLECT_SCORE, applyScoreDelta } from '../utils/score-consequences';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const COIN_SYSTEM_ID = 'coin-system';

export class CoinSystem implements GameSystem {
  readonly id = COIN_SYSTEM_ID;

  private engine: GameEngine | null = null;
  private removeFrameListener: (() => void) | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.coinRef.current = createCoinPoolState();
    resetCoinActiveLifecycleDebug();
    this.removeFrameListener = engine.onFrame(() => {
      tickCoinActiveLifecycleDebug(engine);
    });
  }

  unmount(): void {
    this.removeFrameListener?.();
    this.removeFrameListener = null;
    resetCoinActiveLifecycleDebug();
    if (this.engine) {
      this.engine.coinRef.current = createCoinPoolState();
    }
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    this.consumeCoinSpawnRequests(engine);
    this.collectCoinsWithPlayer(engine);
    this.despawnCoinsBelowViewport(engine);
  }

  private consumeCoinSpawnRequests(engine: GameEngine): void {
    const spawnState = engine.spawnRef.current;
    const pendingCount = spawnState.pendingCount;
    if (pendingCount <= 0) {
      return;
    }

    const requests = spawnState.requests;
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < pendingCount; readIndex += 1) {
      const request = requests[readIndex];
      if (request.kind !== 'coin') {
        copySpawnRequestToWriteIndex(requests, writeIndex, readIndex, request);
        writeIndex += 1;
        continue;
      }

      logCoinSystemReceivedRequest(request.id);

      if (isSpawnRequestPastDespawn(engine, request.worldY, GAME_CONFIG.COIN_DESPAWN_MARGIN)) {
        logCoinStaleDropped(request.id);
        continue;
      }

      if (this.spawnCoinFromRequest(engine, request)) {
        continue;
      }

      logCoinRetained(request.id);
      writeIndex = retainFailedSpawnRequest(requests, writeIndex, readIndex, request);
    }

    spawnState.pendingCount = writeIndex;
  }

  private spawnCoinFromRequest(engine: GameEngine, request: SpawnRequest): boolean {
    const pool = engine.coinRef.current;
    const coins = pool.coins;
    let poolIndex = -1;
    let slot = null as (typeof coins)[number] | null;

    for (let index = 0; index < coins.length; index += 1) {
      if (!coins[index].active) {
        slot = coins[index];
        poolIndex = index;
        break;
      }
    }

    if (!slot || poolIndex < 0) {
      return false;
    }

    activateCoinFromSpawn(slot, pool, {
      worldX: request.worldX,
      worldY: resolveCoinActivationWorldY(engine, request.worldY),
      spawnRequestId: request.id,
      laneIndex: request.laneIndex,
    });
    logCoinActivated(request.id);
    registerCoinActivatedForLifecycleDebug(engine, poolIndex, slot);
    return true;
  }

  private collectCoinsWithPlayer(engine: GameEngine): void {
    const player = engine.playerRef.current;
    if (!player) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const cameraOffsetX = engine.cameraRef.current.offsetX;
    const pool = engine.coinRef.current;
    const coins = pool.coins;

    const { PLAYER_COLLISION_PADDING, COIN_COLLISION_PADDING } = GAME_CONFIG;

    const playerLeft = player.x;
    const playerTop = player.y;
    const playerWidth = player.width;
    const playerHeight = player.height;

    for (let index = 0; index < coins.length; index += 1) {
      const coin = coins[index];
      if (!coin.active) {
        continue;
      }

      const rect = coinWorldToScreenRect(coin, scrollOffsetY, cameraOffsetX);

      const hit = aabbIntersectsWithPadding(
        playerLeft,
        playerTop,
        playerWidth,
        playerHeight,
        PLAYER_COLLISION_PADDING,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        COIN_COLLISION_PADDING,
      );

      if (hit) {
        logCoinCollected(coin.id);
        unregisterCoinLifecycleDebug(index, 'collected', coin.id);
        applyScoreDelta(engine.scoreRef.current, COIN_COLLECT_SCORE);
        spawnGameplayFeedbackForCoinCollect(engine);
        collectCoin(coin, pool);
      }
    }
  }

  private despawnCoinsBelowViewport(engine: GameEngine): void {
    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.COIN_DESPAWN_MARGIN;
    const pool = engine.coinRef.current;
    const coins = pool.coins;

    for (let index = 0; index < coins.length; index += 1) {
      const coin = coins[index];
      if (!coin.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, coin.worldY);
      if (screenY > despawnScreenY) {
        logCoinDespawned(coin.id);
        unregisterCoinLifecycleDebug(index, 'despawned', coin.id);
        deactivateCoin(coin, pool);
      }
    }
  }
}
