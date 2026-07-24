export type ScoreState = {
  currentScore: number;
  /**
   * Last rewarded distance score bucket index (`floor(totalDistance / DISTANCE_METERS_PER_SCORE_POINT)`).
   * Used so multi-threshold jumps in one fixed step still award every missed +1.
   */
  lastDistanceScoreBucket: number;
};

export function createInitialScoreState(): ScoreState {
  return {
    currentScore: 0,
    lastDistanceScoreBucket: 0,
  };
}

export function resetScoreState(state: ScoreState): void {
  state.currentScore = 0;
  state.lastDistanceScoreBucket = 0;
}
