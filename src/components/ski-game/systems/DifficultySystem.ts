import type { GameEngine } from '../engine/GameEngine';
import { createInitialDifficultyState, syncDifficultyFromElapsed } from '../types/DifficultyTypes';
import type { GameSystem } from '../types';

export const DIFFICULTY_SYSTEM_ID = 'difficulty-system';

export class DifficultySystem implements GameSystem {
  readonly id = DIFFICULTY_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.difficultyRef.current = createInitialDifficultyState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.difficultyRef.current = createInitialDifficultyState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const difficulty = engine.difficultyRef.current;
    difficulty.elapsedTimeMs += fixedDeltaMs;
    syncDifficultyFromElapsed(difficulty);
  }
}
