import type { GameEngine } from '../engine/GameEngine';
import { createInitialMovementState } from '../types/movement-state';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const MOVEMENT_SYSTEM_ID = 'movement-system';

const VELOCITY_EPSILON = 0.5;

export class MovementSystem implements GameSystem {
  readonly id = MOVEMENT_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.movementRef.current = createInitialMovementState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.movementRef.current = createInitialMovementState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const player = engine.playerRef.current;
    const viewport = engine.viewportRef.current;
    if (!player || !viewport) {
      return;
    }

    const deltaSeconds = fixedDeltaMs / 1000;
    const input = engine.inputRef.current;
    const movement = engine.movementRef.current;

    const {
      PLAYER_MAX_SPEED,
      PLAYER_ACCELERATION,
      PLAYER_DECELERATION,
      PLAYER_HORIZONTAL_PADDING,
    } = GAME_CONFIG;

    let targetVelocityX = 0;
    if (input.leftPressed) {
      targetVelocityX = -PLAYER_MAX_SPEED;
    } else if (input.rightPressed) {
      targetVelocityX = PLAYER_MAX_SPEED;
    }

    let velocityX = movement.velocityX;

    if (targetVelocityX !== 0) {
      if (velocityX < targetVelocityX) {
        velocityX += PLAYER_ACCELERATION * deltaSeconds;
        if (velocityX > targetVelocityX) {
          velocityX = targetVelocityX;
        }
      } else if (velocityX > targetVelocityX) {
        velocityX -= PLAYER_ACCELERATION * deltaSeconds;
        if (velocityX < targetVelocityX) {
          velocityX = targetVelocityX;
        }
      }
    } else if (velocityX > 0) {
      velocityX -= PLAYER_DECELERATION * deltaSeconds;
      if (velocityX < 0) {
        velocityX = 0;
      }
    } else if (velocityX < 0) {
      velocityX += PLAYER_DECELERATION * deltaSeconds;
      if (velocityX > 0) {
        velocityX = 0;
      }
    }

    if (Math.abs(velocityX) < VELOCITY_EPSILON) {
      velocityX = 0;
    }

    movement.velocityX = velocityX;

    let nextX = player.x + velocityX * deltaSeconds;

    const minX = PLAYER_HORIZONTAL_PADDING;
    const maxX = viewport.width - PLAYER_HORIZONTAL_PADDING - player.width;

    if (maxX < minX) {
      nextX = minX;
      movement.velocityX = 0;
    } else if (nextX < minX) {
      nextX = minX;
      movement.velocityX = 0;
    } else if (nextX > maxX) {
      nextX = maxX;
      movement.velocityX = 0;
    }

    player.x = nextX;
  }
}
