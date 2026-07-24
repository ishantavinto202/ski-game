import type { ChaserState } from '../types/ChaserTypes';
import { createInitialChaserState, resetChaserState } from '../types/ChaserTypes';
import { GAME_CONFIG } from '../utils/GameConfig';

export { createInitialChaserState, resetChaserState };
export type { ChaserState };

/**
 * Health-based baseline gap. Lower health → smaller (closer) baseline.
 * 1 heart uses DANGER and never allows a farther baseline.
 */
export function resolveChaserBaselineGap(currentHealth: number): number {
  if (currentHealth <= 1) {
    return GAME_CONFIG.CHASER_DANGER_GAP;
  }
  if (currentHealth === 2) {
    return GAME_CONFIG.CHASER_PRESSURE_GAP;
  }
  return GAME_CONFIG.CHASER_SAFE_GAP;
}

/**
 * Natural target from health baseline minus accumulated chase pressure.
 * Does not include Speed Boost escape bonus.
 * Pressure only closes the gap; 1-heart never exceeds DANGER_GAP.
 */
export function resolveChaserNaturalTargetGap(
  currentHealth: number,
  chasePressure: number,
): number {
  const baseline = resolveChaserBaselineGap(currentHealth);
  const pressure = chasePressure > 0 ? chasePressure : 0;
  let target = baseline - pressure;

  if (target < GAME_CONFIG.CHASER_MIN_GAP) {
    target = GAME_CONFIG.CHASER_MIN_GAP;
  }
  if (target > baseline) {
    target = baseline;
  }
  if (currentHealth <= 1 && target > GAME_CONFIG.CHASER_DANGER_GAP) {
    target = GAME_CONFIG.CHASER_DANGER_GAP;
  }

  return target;
}

/**
 * Final chaser target = natural health/pressure gap + optional boost escape bonus.
 * Boost bonus is not clamped to SAFE — temporary separation may push chaser off-screen.
 */
export function resolveChaserFinalTargetGap(
  currentHealth: number,
  chasePressure: number,
  isSpeedBoostActive: boolean,
): number {
  const naturalTarget = resolveChaserNaturalTargetGap(currentHealth, chasePressure);
  if (!isSpeedBoostActive) {
    return naturalTarget;
  }
  return naturalTarget + GAME_CONFIG.CHASER_BOOST_ESCAPE_BONUS;
}

/** Visible snow between player bottom and chaser top (px). currentGap is player-top → chaser-top. */
export function resolveChaserEdgeToEdgeGap(currentGap: number): number {
  return currentGap - GAME_CONFIG.PLAYER_HEIGHT;
}

/** Apply chase pressure from one accepted obstacle hit. Amount ≤ 0 is a no-op. */
export function applyChasePressure(state: ChaserState, amount: number): void {
  if (amount <= 0) {
    return;
  }

  state.chasePressure += amount;
  if (state.chasePressure > GAME_CONFIG.CHASER_MAX_PRESSURE) {
    state.chasePressure = GAME_CONFIG.CHASER_MAX_PRESSURE;
  }
  state.timeSinceLastPressureMs = 0;
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
  state.targetGap = resolveChaserNaturalTargetGap(currentHealth, state.chasePressure);
  state.currentGap = GAME_CONFIG.CHASER_PRESSURE_GAP;
  const playerCenterX = playerX + playerWidth * 0.5;
  state.x = playerCenterX - GAME_CONFIG.CHASER_WIDTH * 0.5;
  state.y = playerY + state.currentGap;
}
