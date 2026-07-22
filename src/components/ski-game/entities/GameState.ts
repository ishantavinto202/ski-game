import type { GameEngine } from '../engine/GameEngine';
import type { EngineRef } from '../types/engine-ref';

import {
  createInitialGameStateRefState,
  type GameFlowState,
  type GameStateRefState,
  type PendingGameTransition,
} from '../types/GameStateTypes';

export function createInitialGameState(): GameStateRefState {
  return createInitialGameStateRefState();
}

function requestTransition(
  gameStateRef: EngineRef<GameStateRefState>,
  transition: Exclude<PendingGameTransition, null>,
): void {
  gameStateRef.current.pendingTransition = transition;
}

export function requestStartGame(engine: GameEngine): void {
  requestTransition(engine.gameStateRef, 'start');
}

export function requestPauseGame(engine: GameEngine): void {
  requestTransition(engine.gameStateRef, 'pause');
}

export function requestResumeGame(engine: GameEngine): void {
  requestTransition(engine.gameStateRef, 'resume');
}

export function requestGameOver(engine: GameEngine): void {
  requestTransition(engine.gameStateRef, 'game_over');
}

function resolveNextState(
  currentState: GameFlowState,
  transition: Exclude<PendingGameTransition, null>,
): GameFlowState | null {
  if (transition === 'start') {
    return currentState === 'ready' ? 'playing' : null;
  }
  if (transition === 'pause') {
    return currentState === 'playing' ? 'paused' : null;
  }
  if (transition === 'resume') {
    return currentState === 'paused' ? 'playing' : null;
  }
  if (transition === 'game_over') {
    return currentState === 'playing' ? 'game_over' : null;
  }
  return null;
}

/**
 * Applies a pending transition if valid. Clears pendingTransition either way. No allocations.
 */
export function applyPendingGameTransition(state: GameStateRefState): void {
  const pending = state.pendingTransition;
  if (pending === null) {
    return;
  }

  state.pendingTransition = null;

  const nextState = resolveNextState(state.currentState, pending);
  if (nextState === null) {
    return;
  }

  state.previousState = state.currentState;
  state.currentState = nextState;
}

export function isGameplaySimulationActive(state: GameStateRefState): boolean {
  return state.currentState === 'playing';
}
