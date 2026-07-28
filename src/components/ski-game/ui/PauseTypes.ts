import type { GameFlowState } from '../types/GameStateTypes';

export type PauseQuitHandler = () => void;

export type PauseOverlayProps = {
  onQuitPress?: PauseQuitHandler;
};

/** Numeric mirror of `gameStateRef.currentState` for Reanimated worklets. */
export const GAME_FLOW_STATE_INDEX: Record<GameFlowState, number> = {
  menu: 0,
  ready: 1,
  playing: 2,
  paused: 3,
  game_over: 4,
};

export const PAUSE_FLOW_PLAYING = GAME_FLOW_STATE_INDEX.playing;
export const PAUSE_FLOW_PAUSED = GAME_FLOW_STATE_INDEX.paused;

export const PAUSE_BUTTON_SIZE = 44;
export const PAUSE_BUTTON_INSET = 12;
export const PAUSE_OVERLAY_SCRIM_OPACITY = 0.32;

export const PAUSE_PLACEHOLDER_QUIT = (): void => {
  // Default when no onQuitPress is supplied. SkiGameRoot wires Quit → Main Menu.
};
