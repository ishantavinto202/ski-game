import { GAME_FLOW_STATE_INDEX } from './PauseTypes';

export type GameOverActionHandler = () => void;

export type GameOverOverlayProps = {
  onPlayAgainPress?: GameOverActionHandler;
  onQuitPress?: GameOverActionHandler;
};

export const GAME_FLOW_GAME_OVER = GAME_FLOW_STATE_INDEX.game_over;

export const GAME_OVER_OVERLAY_Z_INDEX = 40;

export const GAME_OVER_PLACEHOLDER_PLAY_AGAIN = (): void => {
  // Default Play Again is handled by GameOverOverlay via playAgain(engine).
};

export const GAME_OVER_PLACEHOLDER_QUIT = (): void => {
  // Navigation / session teardown will plug in here.
};

export type GameOverSummaryValues = {
  currentScore: number;
  totalDistance: number;
  totalCoinsCollected: number;
};

export type GameOverCacheState = {
  summaryScore: number;
  summaryDistance: number;
  summaryCoins: number;
};

export function createInitialGameOverCacheState(): GameOverCacheState {
  return {
    summaryScore: 0,
    summaryDistance: 0,
    summaryCoins: 0,
  };
}

export function clearGameOverCacheState(state: GameOverCacheState): void {
  state.summaryScore = 0;
  state.summaryDistance = 0;
  state.summaryCoins = 0;
}

export function captureGameOverSummary(
  cache: GameOverCacheState,
  summary: GameOverSummaryValues,
): void {
  cache.summaryScore = summary.currentScore;
  cache.summaryDistance = summary.totalDistance;
  cache.summaryCoins = summary.totalCoinsCollected;
}

/** Read-only snapshot from engine refs (for tests / future use). */
export function readGameOverSummaryFromRefs(params: {
  scoreRef: { current: { currentScore: number } };
  timeRef: { current: { totalDistance: number } };
  coinRef: { current: { totalCoinsCollected: number } };
  healthRef: { current: { currentHealth: number } };
}): GameOverSummaryValues {
  void params.healthRef.current.currentHealth;
  return {
    currentScore: params.scoreRef.current.currentScore,
    totalDistance: params.timeRef.current.totalDistance,
    totalCoinsCollected: params.coinRef.current.totalCoinsCollected,
  };
}
