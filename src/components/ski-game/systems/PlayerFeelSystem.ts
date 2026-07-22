import type { GameEngine } from '../engine/GameEngine';
import { createInitialPlayerFeelState } from '../types/player-feel-state';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const PLAYER_FEEL_SYSTEM_ID = 'player-feel-system';

const LEAN_ANGLE_EPSILON = 0.05;

export class PlayerFeelSystem implements GameSystem {
  readonly id = PLAYER_FEEL_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.playerFeelRef.current = createInitialPlayerFeelState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.playerFeelRef.current = createInitialPlayerFeelState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    if (!engine.playerRef.current) {
      return;
    }

    const deltaSeconds = fixedDeltaMs / 1000;
    const velocityX = engine.movementRef.current.velocityX;
    const feel = engine.playerFeelRef.current;

    const { PLAYER_MAX_SPEED, PLAYER_MAX_LEAN_ANGLE, PLAYER_LEAN_SMOOTHING } = GAME_CONFIG;

    let targetLeanAngle = 0;
    if (PLAYER_MAX_SPEED > 0) {
      targetLeanAngle = (velocityX / PLAYER_MAX_SPEED) * PLAYER_MAX_LEAN_ANGLE;
    }

    if (targetLeanAngle > PLAYER_MAX_LEAN_ANGLE) {
      targetLeanAngle = PLAYER_MAX_LEAN_ANGLE;
    } else if (targetLeanAngle < -PLAYER_MAX_LEAN_ANGLE) {
      targetLeanAngle = -PLAYER_MAX_LEAN_ANGLE;
    }

    const dampFactor = 1 - Math.exp(-PLAYER_LEAN_SMOOTHING * deltaSeconds);
    const leanAngle = feel.leanAngle + (targetLeanAngle - feel.leanAngle) * dampFactor;

    if (Math.abs(leanAngle) < LEAN_ANGLE_EPSILON && Math.abs(targetLeanAngle) < LEAN_ANGLE_EPSILON) {
      feel.leanAngle = 0;
      return;
    }

    feel.leanAngle = leanAngle;
  }
}
