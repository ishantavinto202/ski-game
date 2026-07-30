import type { GameEngine } from '../engine/GameEngine';
import { profileCollisionCheck } from '../profiling/PerformanceProfiling';
import { resetCollisionState } from '../types/CollisionTypes';
import type { GameSystem } from '../types';
import { aabbIntersectsWithPadding } from '../utils/collision';
import { getObstacleCollisionScreenRect } from '../utils/obstacle-collision';
import { GAME_CONFIG } from '../utils/GameConfig';

export const COLLISION_SYSTEM_ID = 'collision-system';

export class CollisionSystem implements GameSystem {
  readonly id = COLLISION_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    resetCollisionState(engine.collisionRef.current);
  }

  unmount(): void {
    if (this.engine) {
      resetCollisionState(this.engine.collisionRef.current);
    }
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const collision = engine.collisionRef.current;
    resetCollisionState(collision);

    const player = engine.playerRef.current;
    if (!player) {
      return;
    }

    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
    const cameraOffsetX = engine.cameraRef.current.offsetX;
    const playerPadding = GAME_CONFIG.PLAYER_COLLISION_PADDING;
    const obstaclePadding = GAME_CONFIG.OBSTACLE_COLLISION_PADDING;

    const playerLeft = player.x;
    const playerTop = player.y;
    const playerWidth = player.width;
    const playerHeight = player.height;
    const playerRight = playerLeft + playerWidth;
    const playerBottom = playerTop + playerHeight;

    const obstacles = engine.obstacleRef.current.obstacles;
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      if (!obstacle.active) {
        continue;
      }

      // Conservative reject on gameplay AABB (physical hitbox ⊆ gameplay rect).
      const gameplayLeft = obstacle.worldX - obstacle.width * 0.5 - cameraOffsetX;
      const gameplayTop = scrollOffsetY - obstacle.worldY - obstacle.height * 0.5;
      if (
        playerRight <= gameplayLeft ||
        playerLeft >= gameplayLeft + obstacle.width ||
        playerBottom <= gameplayTop ||
        playerTop >= gameplayTop + obstacle.height
      ) {
        profileCollisionCheck(true, false);
        continue;
      }

      const rect = getObstacleCollisionScreenRect(obstacle, scrollOffsetY, cameraOffsetX);

      const hit = aabbIntersectsWithPadding(
        playerLeft,
        playerTop,
        playerWidth,
        playerHeight,
        playerPadding,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        obstaclePadding,
      );

      if (!hit) {
        profileCollisionCheck(true, false);
        continue;
      }

      profileCollisionCheck(false, true);
      collision.hasCollision = true;
      collision.obstacleId = obstacle.id;
      collision.obstacleType = obstacle.variant;
      return;
    }
  }
}
