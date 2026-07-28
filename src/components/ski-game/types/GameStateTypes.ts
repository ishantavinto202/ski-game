export type GameFlowState = 'menu' | 'ready' | 'playing' | 'paused' | 'game_over';

export const GAME_STATE_SYSTEM_ID = 'game-state-system';

export type PendingGameTransition = 'start' | 'pause' | 'resume' | 'game_over' | null;

export type GameStateRefState = {
  currentState: GameFlowState;
  previousState: GameFlowState;
  pendingTransition: PendingGameTransition;
};

/** Cold-launch / main-menu resting state. Gameplay resets use `ready` instead. */
export function createInitialGameStateRefState(): GameStateRefState {
  return {
    currentState: 'menu',
    previousState: 'menu',
    pendingTransition: null,
  };
}

/** In-run restart resting state (`resetGame` / systems mount for a play session). */
export function createReadyGameStateRefState(): GameStateRefState {
  return {
    currentState: 'ready',
    previousState: 'ready',
    pendingTransition: null,
  };
}
