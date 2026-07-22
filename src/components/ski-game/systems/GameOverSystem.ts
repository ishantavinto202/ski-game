import { requestGameOver } from '../entities/GameState';
import type { GameEngine } from '../engine/GameEngine';
import type { GameSystem } from '../types';
import { logCabinDebugSummary } from '../utils/cabin-debug';
import { logCoinSchedulingDebugSummary } from '../utils/coin-scheduling-debug';
import { captureGameOverSummary, readGameOverSummaryFromRefs } from '../ui/GameOverTypes';

export const GAME_OVER_SYSTEM_ID = 'game-over-system';

export class GameOverSystem implements GameSystem {
  readonly id = GAME_OVER_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
  }

  unmount(): void {
    this.engine = null;
  }

  fixedUpdate(_fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    if (engine.gameStateRef.current.currentState !== 'playing') {
      return;
    }

    if (engine.healthRef.current.currentHealth > 0) {
      return;
    }

    captureGameOverSummary(
      engine.gameOverCacheRef.current,
      readGameOverSummaryFromRefs({
        timeRef: engine.timeRef,
        coinRef: engine.coinRef,
        healthRef: engine.healthRef,
      }),
    );

    logCabinDebugSummary();
    logCoinSchedulingDebugSummary();
    requestGameOver(engine);
  }
}
