import { GAME_CONFIG } from '../utils/GameConfig';

export type DifficultyState = {
  elapsedTimeMs: number;
  currentLevel: number;
  speedMultiplier: number;
  spawnIntervalMultiplier: number;
};

const DIFFICULTY_LEVEL_COUNT = 10;

export function createInitialDifficultyState(): DifficultyState {
  return {
    elapsedTimeMs: 0,
    currentLevel: 1,
    speedMultiplier: 1,
    spawnIntervalMultiplier: 1,
  };
}

/**
 * Linear ramp from baseline (t=0) to configured caps (t=1). No allocations.
 */
export function syncDifficultyFromElapsed(state: DifficultyState): void {
  const rampMs = GAME_CONFIG.DIFFICULTY_RAMP_DURATION_MS;
  let t = 0;
  if (rampMs > 0) {
    t = state.elapsedTimeMs / rampMs;
  }
  if (t > 1) {
    t = 1;
  }

  const maxSpeedMultiplier = GAME_CONFIG.MAX_DIFFICULTY_SPEED_MULTIPLIER;
  const minSpawnIntervalMultiplier = GAME_CONFIG.MIN_SPAWN_INTERVAL_MULTIPLIER;

  state.speedMultiplier = 1 + t * (maxSpeedMultiplier - 1);
  state.spawnIntervalMultiplier = 1 + t * (minSpawnIntervalMultiplier - 1);

  if (t >= 1) {
    state.currentLevel = DIFFICULTY_LEVEL_COUNT;
    return;
  }

  const levelIndex = Math.floor(t * (DIFFICULTY_LEVEL_COUNT - 1));
  state.currentLevel = 1 + levelIndex;
}
