import {
  activateObstacleFromSpawn,
  createObstaclePoolState,
  deactivateObstacle,
  findInactiveObstacleSlot,
  pickWeightedObstacleVariant,
} from '../entities/Obstacle';
import type { GameEngine } from '../engine/GameEngine';
import type { SpawnRequest } from '../types/SpawnTypes';
import type { GameSystem } from '../types';
import { worldYCenterToScreenY } from '../utils/world-coordinates';
import { logCabinSpawned } from '../utils/cabin-debug';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  isSpawnRequestPastDespawn,
  copySpawnRequestToWriteIndex,
  retainFailedSpawnRequest,
} from '../utils/spawn-request-intake';

export const OBSTACLE_SYSTEM_ID = 'obstacle-system';

export class ObstacleSystem implements GameSystem {
  readonly id = OBSTACLE_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.obstacleRef.current = createObstaclePoolState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.obstacleRef.current = createObstaclePoolState();
    }
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    this.consumeObstacleSpawnRequests(engine);
    this.despawnObstaclesBelowViewport(engine);
  }

  private consumeObstacleSpawnRequests(engine: GameEngine): void {
    const spawnState = engine.spawnRef.current;
    const pendingCount = spawnState.pendingCount;
    if (pendingCount <= 0) {
      return;
    }

    const requests = spawnState.requests;
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < pendingCount; readIndex += 1) {
      const request = requests[readIndex];
      if (request.kind !== 'obstacle') {
        copySpawnRequestToWriteIndex(requests, writeIndex, readIndex, request);
        writeIndex += 1;
        continue;
      }

      if (isSpawnRequestPastDespawn(engine, request.worldY, GAME_CONFIG.OBSTACLE_DESPAWN_MARGIN)) {
        continue;
      }

      if (this.spawnObstacleFromRequest(engine, request)) {
        continue;
      }

      writeIndex = retainFailedSpawnRequest(requests, writeIndex, readIndex, request);
    }

    spawnState.pendingCount = writeIndex;
  }

  private spawnObstacleFromRequest(engine: GameEngine, request: SpawnRequest): boolean {
    const pool = engine.obstacleRef.current;
    const slot = findInactiveObstacleSlot(pool);
    if (!slot) {
      return false;
    }

    const variant =
      request.obstacleVariant !== null
        ? request.obstacleVariant
        : pickWeightedObstacleVariant(pool);
    activateObstacleFromSpawn(slot, pool, {
      variant,
      worldX: request.worldX,
      worldY: request.worldY,
      spawnRequestId: request.id,
      laneIndex: request.laneIndex,
    });

    if (variant === 'cabin') {
      logCabinSpawned(request.worldX, request.worldY);
    }
    return true;
  }

  private despawnObstaclesBelowViewport(engine: GameEngine): void {
    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const despawnScreenY = viewport.height + GAME_CONFIG.OBSTACLE_DESPAWN_MARGIN;
    const pool = engine.obstacleRef.current;
    const obstacles = pool.obstacles;

    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      if (!obstacle.active) {
        continue;
      }

      const screenY = worldYCenterToScreenY(scrollOffsetY, obstacle.worldY);
      if (screenY > despawnScreenY) {
        deactivateObstacle(obstacle, pool);
      }
    }
  }
}
