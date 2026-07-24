import type { GameEngine } from '../engine/GameEngine';
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
    const { PLAYER_COLLISION_PADDING, OBSTACLE_COLLISION_PADDING } = GAME_CONFIG;

    const playerLeft = player.x;
    const playerTop = player.y;
    const playerWidth = player.width;
    const playerHeight = player.height;

    const obstacles = engine.obstacleRef.current.obstacles;
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      if (!obstacle.active) {
        continue;
      }

      const rect = getObstacleCollisionScreenRect(obstacle, scrollOffsetY, cameraOffsetX);

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
        OBSTACLE_COLLISION_PADDING,
      );

      if (!hit) {
        continue;
      }

      collision.hasCollision = true;
      collision.obstacleId = obstacle.id;
      collision.obstacleType = obstacle.variant;
      return;
    }
  }
}
