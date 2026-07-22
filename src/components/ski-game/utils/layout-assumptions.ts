import type { GameEngine } from '../engine/GameEngine';

import { GAME_CONFIG } from './GameConfig';

export function lookAheadScreenHeightPx(engine: GameEngine): number {
  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return 0;
  }
  return viewport.height * GAME_CONFIG.LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO;
}

export function minSafeLaneWidthPx(viewportWidth: number): number {
  return viewportWidth * GAME_CONFIG.OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO;
}

export function maxObstaclePatternWidthPx(viewportWidth: number): number {
  return viewportWidth * GAME_CONFIG.OBSTACLE_MAX_PATTERN_WIDTH_RATIO;
}

/** Normalized touch X (0–1) within the game viewport. */
export function isSteerLeftNormalizedX(normalizedX: number): boolean {
  return normalizedX < GAME_CONFIG.STEER_ZONE_DIVIDER_X;
}

/** Normalized touch X (0–1) within the game viewport. */
export function isSteerRightNormalizedX(normalizedX: number): boolean {
  return normalizedX >= GAME_CONFIG.STEER_ZONE_DIVIDER_X;
}

export function screenXToNormalized(viewportWidth: number, screenX: number): number {
  if (viewportWidth <= 0) {
    return 0;
  }
  return screenX / viewportWidth;
}
