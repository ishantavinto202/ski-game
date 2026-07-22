import { applyPendingGameTransition, createInitialGameState } from '../entities/GameState';
import type { GameEngine } from '../engine/GameEngine';
import { GAME_STATE_SYSTEM_ID } from '../types/GameStateTypes';
import type { GameSystem } from '../types';

export { GAME_STATE_SYSTEM_ID };

export class GameStateSystem implements GameSystem {
  readonly id = GAME_STATE_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.gameStateRef.current = createInitialGameState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.gameStateRef.current = createInitialGameState();
    }
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    applyPendingGameTransition(engine.gameStateRef.current);
  }
}
