import {
  activateShieldFromSpawn,
  collectShieldPickup,
  consumeShieldEffect,
  createShieldPoolState,
  deactivateShield,
  findInactiveShieldSlot,
  shieldWorldToScreenRect,
  tickShieldDuration,
} from '../entities/Shield';
import type { GameEngine } from '../engine/GameEngine';
import type { SpawnRequest } from '../types/SpawnTypes';
import type { ShieldPoolState } from '../types/ShieldTypes';
import type { GameSystem } from '../types';
import { aabbIntersectsWithPadding } from '../utils/collision';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  isSpawnRequestPastDespawn,
  copySpawnRequestToWriteIndex,
  retainFailedSpawnRequest,
} from '../utils/spawn-request-intake';
import { resolveShieldActivationWorldY } from '../utils/coin-activation-world-y';
import {
  isShieldPickupBlockedByActiveObstacles,
  nudgeShieldWorldYClearOfActiveObstacles,
} from '../utils/spawn-validation';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const SHIELD_SYSTEM_ID = 'shield-system';

export class ShieldSystem implements GameSystem {
  readonly id = SHIELD_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.shieldRef.current = createShieldPoolState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.shieldRef.current = createShieldPoolState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const pool = engine.shieldRef.current;
    tickShieldDuration(pool, fixedDeltaMs);
    this.consumeShieldEffectIfBlockingObstacleHit(engine, pool);

    this.consumeShieldSpawnRequests(engine);
    this.collectShieldsWithPlayer(engine);
    this.despawnShieldsBelowViewport(engine);
  }

  private consumeShieldEffectIfBlockingObstacleHit(engine: GameEngine, pool: ShieldPoolState): void {
    if (!pool.isShieldActive) {
      return;
    }

    if (!engine.collisionRef.current.hasCollision) {
      return;
    }

    consumeShieldEffect(pool);
  }

  private consumeShieldSpawnRequests(engine: GameEngine): void {
    const spawnState = engine.spawnRef.current;
    const pendingCount = spawnState.pendingCount;
    if (pendingCount <= 0) {
      return;
    }

    const requests = spawnState.requests;
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < pendingCount; readIndex += 1) {
      const request = requests[readIndex];
      if (request.kind !== 'shield') {
        copySpawnRequestToWriteIndex(requests, writeIndex, readIndex, request);
        writeIndex += 1;
        continue;
      }

      if (isSpawnRequestPastDespawn(engine, request.worldY, GAME_CONFIG.SHIELD_DESPAWN_MARGIN)) {
        continue;
      }

      if (this.spawnShieldFromRequest(engine, request)) {
        continue;
      }

      writeIndex = retainFailedSpawnRequest(requests, writeIndex, readIndex, request);
    }

    spawnState.pendingCount = writeIndex;
  }

  private spawnShieldFromRequest(engine: GameEngine, request: SpawnRequest): boolean {
    const pool = engine.shieldRef.current;
    const slot = findInactiveShieldSlot(pool);
    if (!slot) {
      return false;
    }

    const worldY = nudgeShieldWorldYClearOfActiveObstacles(
      engine.obstacleRef.current,
      request.worldX,
      resolveShieldActivationWorldY(engine, request.worldY),
      request.laneIndex,
    );

    if (
      isShieldPickupBlockedByActiveObstacles(
        engine.obstacleRef.current,
        request.worldX,
        worldY,
        request.laneIndex,
      )
    ) {
      return false;
    }

    activateShieldFromSpawn(slot, pool, {
      worldX: request.worldX,
      worldY,
      spawnRequestId: request.id,
      laneIndex: request.laneIndex,
    });
    return true;
  }

  private collectShieldsWithPlayer(engine: GameEngine): void {
    const player = engine.playerRef.current;
    if (!player) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const cameraOffsetX = engine.cameraRef.current.offsetX;
    const pool = engine.shieldRef.current;
    const shields = pool.shields;

    const { PLAYER_COLLISION_PADDING, SHIELD_COLLISION_PADDING } = GAME_CONFIG;

    const playerLeft = player.x;
    const playerTop = player.y;
    const playerWidth = player.width;
    const playerHeight = player.height;

    for (let index = 0; index < shields.length; index += 1) {
      const shield = shields[index];
      if (!shield.active) {
        continue;
      }

      const rect = shieldWorldToScreenRect(shield, scrollOffsetY, cameraOffsetX);

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
        SHIELD_COLLISION_PADDING,
      );

      if (hit) {
        collectShieldPickup(shield, pool);
      }
    }
  }

  private despawnShieldsBelowViewport(engine: GameEngine): void {
    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.SHIELD_DESPAWN_MARGIN;
    const pool = engine.shieldRef.current;
    const shields = pool.shields;

    for (let index = 0; index < shields.length; index += 1) {
      const shield = shields[index];
      if (!shield.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, shield.worldY);
      if (screenY > despawnScreenY) {
        deactivateShield(shield, pool);
      }
    }
  }
}
