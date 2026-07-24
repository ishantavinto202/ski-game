import type { GameEngine } from '../engine/GameEngine';
import { createInitialTimeState } from '../types/time-state';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';
import { applyDistanceScoreProgress } from '../utils/score-consequences';

export const TIME_SYSTEM_ID = 'time-system';

export class TimeSystem implements GameSystem {
  readonly id = TIME_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.timeRef.current = createInitialTimeState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.timeRef.current = createInitialTimeState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const time = engine.timeRef.current;
    time.deltaMs = fixedDeltaMs;
    time.elapsedMs += fixedDeltaMs;

    const distanceStep = (GAME_CONFIG.BASE_SCROLL_SPEED * fixedDeltaMs) / 1000;
    time.totalDistance += distanceStep;

    applyDistanceScoreProgress(engine.scoreRef.current, time.totalDistance);
  }
}
