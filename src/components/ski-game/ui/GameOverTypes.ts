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
  totalDistance: number;
  totalCoinsCollected: number;
};

export type GameOverCacheState = {
  summaryDistance: number;
  summaryCoins: number;
};

export function createInitialGameOverCacheState(): GameOverCacheState {
  return {
    summaryDistance: 0,
    summaryCoins: 0,
  };
}

export function clearGameOverCacheState(state: GameOverCacheState): void {
  state.summaryDistance = 0;
  state.summaryCoins = 0;
}

export function captureGameOverSummary(
  cache: GameOverCacheState,
  summary: GameOverSummaryValues,
): void {
  cache.summaryDistance = summary.totalDistance;
  cache.summaryCoins = summary.totalCoinsCollected;
}

/** Read-only snapshot from engine refs (for tests / future use). */
export function readGameOverSummaryFromRefs(params: {
  timeRef: { current: { totalDistance: number } };
  coinRef: { current: { totalCoinsCollected: number } };
  healthRef: { current: { currentHealth: number } };
}): GameOverSummaryValues {
  void params.healthRef.current.currentHealth;
  return {
    totalDistance: params.timeRef.current.totalDistance,
    totalCoinsCollected: params.coinRef.current.totalCoinsCollected,
  };
}
