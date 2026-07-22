export type GameFlowState = 'ready' | 'playing' | 'paused' | 'game_over';

export const GAME_STATE_SYSTEM_ID = 'game-state-system';

export type PendingGameTransition = 'start' | 'pause' | 'resume' | 'game_over' | null;

export type GameStateRefState = {
  currentState: GameFlowState;
  previousState: GameFlowState;
  pendingTransition: PendingGameTransition;
};

export function createInitialGameStateRefState(): GameStateRefState {
  return {
    currentState: 'ready',
    previousState: 'ready',
    pendingTransition: null,
  };
}
