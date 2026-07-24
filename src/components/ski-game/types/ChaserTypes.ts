import { GAME_CONFIG } from '../utils/GameConfig';
import type { ChaserPathState } from '../entities/ChaserPath';
import { createChaserPathState } from '../entities/ChaserPath';

export type { ChaserPathState } from '../entities/ChaserPath';

/**
 * Runtime chaser presentation state — no collision, pathfinding, or catch/Game Over authority.
 * Vertical gap follows player health; horizontal X follows the player path (avoidance overrides X only).
 */
export type ChaserState = {
  /** Smoothed vertical gap (px) between player top and chaser top. */
  currentGap: number;
  /** Desired gap from current health (+ Speed Boost bonus while active). */
  targetGap: number;
  /** Screen-space top-left X (px). */
  x: number;
  /** Screen-space top-left Y (px) — behind the skier (larger Y). */
  y: number;
  /** Active visual-avoidance obstacle id (0 = none). Not used by CollisionSystem. */
  avoidObstacleId: number;
  /** Committed steer side: -1 left, 1 right, 0 none. */
  avoidDirection: number;
  /** Last committed steer side for directional hysteresis between obstacles. */
  lastAvoidDirection: number;
  /** Player skiing breadcrumb trail in world space. */
  path: ChaserPathState;
};

export function createInitialChaserState(): ChaserState {
  const introGap = GAME_CONFIG.CHASER_PRESSURE_GAP;
  return {
    currentGap: introGap,
    targetGap: introGap,
    x: 0,
    y: 0,
    avoidObstacleId: 0,
    avoidDirection: 0,
    lastAvoidDirection: 0,
    path: createChaserPathState(),
  };
}

export function resetChaserState(state: ChaserState): void {
  const introGap = GAME_CONFIG.CHASER_PRESSURE_GAP;
  state.currentGap = introGap;
  state.targetGap = introGap;
  state.x = 0;
  state.y = 0;
  state.avoidObstacleId = 0;
  state.avoidDirection = 0;
  state.lastAvoidDirection = 0;
}
