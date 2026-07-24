import type { ChaserState } from '../types/ChaserTypes';
import { createInitialChaserState, resetChaserState } from '../types/ChaserTypes';
import { GAME_CONFIG } from '../utils/GameConfig';

export { createInitialChaserState, resetChaserState };
export type { ChaserState };

/** Health-only vertical target gap (player-top → chaser-top). Obstacles do not affect this. */
export function resolveChaserHealthTargetGap(currentHealth: number): number {
  if (currentHealth <= 1) {
    return GAME_CONFIG.CHASER_DANGER_GAP;
  }

  if (currentHealth === 2) {
    return GAME_CONFIG.CHASER_PRESSURE_GAP;
  }

  return GAME_CONFIG.CHASER_SAFE_GAP;
}

/**
 * Final vertical target = health gap (+ defensive clamp) + optional Speed Boost escape bonus.
 */
export function resolveChaserFinalTargetGap(
  currentHealth: number,
  isSpeedBoostActive: boolean,
): number {
  let target = resolveChaserHealthTargetGap(currentHealth);
  if (target < GAME_CONFIG.CHASER_MIN_GAP) {
    target = GAME_CONFIG.CHASER_MIN_GAP;
  }
  if (!isSpeedBoostActive) {
    return target;
  }
  return target + GAME_CONFIG.CHASER_BOOST_ESCAPE_BONUS;
}

/** Visible snow between player bottom and chaser top (px). currentGap is player-top → chaser-top. */
export function resolveChaserEdgeToEdgeGap(currentGap: number): number {
  return currentGap - GAME_CONFIG.PLAYER_HEIGHT;
}

/**
 * Place the chaser behind the player using currentGap (no smoothing).
 * Used on spawn, layout sync, and Play Again.
 */
export function snapChaserBehindPlayer(
  state: ChaserState,
  playerX: number,
  playerY: number,
  playerWidth: number,
  currentHealth: number,
): void {
  state.targetGap = resolveChaserHealthTargetGap(currentHealth);
  state.currentGap = GAME_CONFIG.CHASER_PRESSURE_GAP;
  const playerCenterX = playerX + playerWidth * 0.5;
  state.x = playerCenterX - GAME_CONFIG.CHASER_WIDTH * 0.5;
  state.y = playerY + state.currentGap;
}
