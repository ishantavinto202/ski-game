import type { GameEngine } from './GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import { GAME_CONFIG } from '../utils/GameConfig';

const MAX_FIXED_STEPS = 8;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;

  constructor(private readonly engine: GameEngine) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTimestamp = performance.now();
    this.engine.timeRef.current.fixedAccumulatorMs = 0;
    this.scheduleFrame();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private scheduleFrame = (): void => {
    if (!this.running) {
      return;
    }
    this.rafId = requestAnimationFrame(this.onFrame);
  };

  private onFrame = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    const frameDeltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const time = this.engine.timeRef.current;
    time.fixedAccumulatorMs += frameDeltaMs;

    const fixedStepMs = GAME_CONFIG.FIXED_TIMESTEP;
    const simulationActive = isGameplaySimulationActive(this.engine.gameStateRef.current);
    let steps = 0;

    if (simulationActive) {
      while (time.fixedAccumulatorMs >= fixedStepMs && steps < MAX_FIXED_STEPS) {
        this.engine.runFixedUpdate(fixedStepMs);
        time.fixedAccumulatorMs -= fixedStepMs;
        steps += 1;
      }

      if (steps >= MAX_FIXED_STEPS) {
        time.fixedAccumulatorMs = 0;
      }
    } else {
      this.engine.runGameStateFixedUpdate(0);
      time.fixedAccumulatorMs = 0;
    }

    this.engine.notifyFrame();
    this.scheduleFrame();
  };
}
