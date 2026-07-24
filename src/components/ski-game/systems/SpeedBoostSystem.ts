import {
  activateSpeedBoostFromSpawn,
  collectSpeedBoostPickup,
  createSpeedBoostPoolState,
  deactivateSpeedBoost,
  findInactiveSpeedBoostSlot,
  speedBoostWorldToScreenRect,
  tickSpeedBoostDuration,
} from '../entities/SpeedBoost';
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
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const SPEED_BOOST_SYSTEM_ID = 'speed-boost-system';

export class SpeedBoostSystem implements GameSystem {
  readonly id = SPEED_BOOST_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.speedBoostRef.current = createSpeedBoostPoolState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.speedBoostRef.current = createSpeedBoostPoolState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const pool = engine.speedBoostRef.current;
    tickSpeedBoostDuration(pool, fixedDeltaMs);

    this.consumeSpeedBoostSpawnRequests(engine);
    this.collectSpeedBoostsWithPlayer(engine);
    this.despawnSpeedBoostsBelowViewport(engine);
  }

  private consumeSpeedBoostSpawnRequests(engine: GameEngine): void {
    const spawnState = engine.spawnRef.current;
    const pendingCount = spawnState.pendingCount;
    if (pendingCount <= 0) {
      return;
    }

    const requests = spawnState.requests;
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < pendingCount; readIndex += 1) {
      const request = requests[readIndex];
      if (request.kind !== 'speed_boost') {
        copySpawnRequestToWriteIndex(requests, writeIndex, readIndex, request);
        writeIndex += 1;
        continue;
      }

      if (
        isSpawnRequestPastDespawn(engine, request.worldY, GAME_CONFIG.SPEED_BOOST_DESPAWN_MARGIN)
      ) {
        continue;
      }

      if (this.spawnSpeedBoostFromRequest(engine, request)) {
        continue;
      }

      writeIndex = retainFailedSpawnRequest(requests, writeIndex, readIndex, request);
    }

    spawnState.pendingCount = writeIndex;
  }

  private spawnSpeedBoostFromRequest(engine: GameEngine, request: SpawnRequest): boolean {
    const pool = engine.speedBoostRef.current;
    const slot = findInactiveSpeedBoostSlot(pool);
    if (!slot) {
      return false;
    }

    activateSpeedBoostFromSpawn(slot, pool, {
      worldX: request.worldX,
      worldY: request.worldY,
      spawnRequestId: request.id,
      laneIndex: request.laneIndex,
    });
    return true;
  }

  private collectSpeedBoostsWithPlayer(engine: GameEngine): void {
    const player = engine.playerRef.current;
    if (!player) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const cameraOffsetX = engine.cameraRef.current.offsetX;
    const pool = engine.speedBoostRef.current;
    const speedBoosts = pool.speedBoosts;

    const { PLAYER_COLLISION_PADDING, SPEED_BOOST_COLLISION_PADDING } = GAME_CONFIG;

    const playerLeft = player.x;
    const playerTop = player.y;
    const playerWidth = player.width;
    const playerHeight = player.height;

    for (let index = 0; index < speedBoosts.length; index += 1) {
      const speedBoost = speedBoosts[index];
      if (!speedBoost.active) {
        continue;
      }

      const rect = speedBoostWorldToScreenRect(speedBoost, scrollOffsetY, cameraOffsetX);

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
        SPEED_BOOST_COLLISION_PADDING,
      );

      if (hit) {
        collectSpeedBoostPickup(speedBoost, pool);
      }
    }
  }

  private despawnSpeedBoostsBelowViewport(engine: GameEngine): void {
    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.SPEED_BOOST_DESPAWN_MARGIN;
    const pool = engine.speedBoostRef.current;
    const speedBoosts = pool.speedBoosts;

    for (let index = 0; index < speedBoosts.length; index += 1) {
      const speedBoost = speedBoosts[index];
      if (!speedBoost.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, speedBoost.worldY);
      if (screenY > despawnScreenY) {
        deactivateSpeedBoost(speedBoost, pool);
      }
    }
  }
}
