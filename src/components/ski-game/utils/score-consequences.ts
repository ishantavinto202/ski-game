import type { ObstacleVariant } from '../types/ObstacleTypes';
import type { ScoreState } from '../types/score-state';

export type ObstacleConsequence = {
  scoreDelta: number;
  healthDamage: number;
  /** Gap reduction applied to the Chaser on an accepted (unshielded) hit. */
  chasePressure: number;
};

/** Authoritative gameplay score / damage / chase-pressure values for obstacle hits. */
export const OBSTACLE_CONSEQUENCES: Record<ObstacleVariant, ObstacleConsequence> = {
  small_rock: { scoreDelta: -15, healthDamage: 0, chasePressure: 8 },
  tree_stump: { scoreDelta: -20, healthDamage: 0, chasePressure: 10 },
  large_boulder: { scoreDelta: -30, healthDamage: 1, chasePressure: 15 },
  tree: { scoreDelta: -25, healthDamage: 1, chasePressure: 15 },
  wooden_fence: { scoreDelta: -35, healthDamage: 1, chasePressure: 20 },
  cabin: { scoreDelta: -50, healthDamage: 2, chasePressure: 30 },
};

/** Score awarded per collected coin (independent of coin count stat). */
export const COIN_COLLECT_SCORE = 20;

/** Meters of travel required to earn +1 passive distance score. */
export const DISTANCE_METERS_PER_SCORE_POINT = 25;

export function applyScoreDelta(state: ScoreState, delta: number): void {
  const next = state.currentScore + delta;
  state.currentScore = next > 0 ? next : 0;
}

/**
 * Awards +1 score for every `DISTANCE_METERS_PER_SCORE_POINT` meters crossed since the last reward.
 * Handles multi-threshold jumps in a single fixed step. Silent — no GameplayFeedback.
 */
export function applyDistanceScoreProgress(state: ScoreState, totalDistance: number): void {
  const currentBucket = Math.floor(totalDistance / DISTANCE_METERS_PER_SCORE_POINT);
  const previousBucket = state.lastDistanceScoreBucket;
  if (currentBucket <= previousBucket) {
    return;
  }

  applyScoreDelta(state, currentBucket - previousBucket);
  state.lastDistanceScoreBucket = currentBucket;
}

export function resolveObstacleConsequence(
  variant: ObstacleVariant | null,
): ObstacleConsequence | null {
  if (variant === null) {
    return null;
  }
  return OBSTACLE_CONSEQUENCES[variant];
}
