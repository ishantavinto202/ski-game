import type { GameEngine } from './GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import {
  isPerformanceProfilingEnabled,
  profileGameLoopBegin,
  profileGameLoopEnd,
  profileRecordFrame,
  setPerformanceProfilingEnabled,
} from '../profiling/PerformanceProfiling';
import { GAME_CONFIG } from '../utils/GameConfig';

/**
 * Bound catch-up work after a delayed frame. Four 60 Hz updates preserve short
 * stalls without letting a single hitch trigger an eight-step CPU spike.
 */
const MAX_FIXED_STEPS = 4;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;

  constructor(private readonly engine: GameEngine) {}

  start(): void {
    if (this.running) {
      return;
    }

    setPerformanceProfilingEnabled(Boolean(GAME_CONFIG.PERFORMANCE_PROFILING));

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

    const profiling = isPerformanceProfilingEnabled();
    const loopStartedAt = profiling ? profileGameLoopBegin() : 0;

    const frameDeltaMs = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    const time = this.engine.timeRef.current;
    const fixedStepMs = GAME_CONFIG.FIXED_TIMESTEP;
    const simulationActive = isGameplaySimulationActive(this.engine.gameStateRef.current);
    let steps = 0;

    if (simulationActive) {
      const maxCatchUpMs = fixedStepMs * MAX_FIXED_STEPS;
      time.fixedAccumulatorMs = Math.min(
        time.fixedAccumulatorMs + frameDeltaMs,
        maxCatchUpMs,
      );

      while (time.fixedAccumulatorMs >= fixedStepMs && steps < MAX_FIXED_STEPS) {
        this.engine.runFixedUpdate(fixedStepMs);
        time.fixedAccumulatorMs -= fixedStepMs;
        steps += 1;
      }

      if (steps === MAX_FIXED_STEPS) {
        time.fixedAccumulatorMs = 0;
      }
    } else {
      this.engine.runGameStateFixedUpdate(0);
      time.fixedAccumulatorMs = 0;
    }

    // Re-read after transitions so pause overlays update while world sync freezes.
    const syncPlayingWorld = isGameplaySimulationActive(this.engine.gameStateRef.current);
    this.engine.notifyFrame(syncPlayingWorld);

    if (profiling) {
      profileRecordFrame(
        frameDeltaMs,
        simulationActive,
        syncPlayingWorld,
        this.engine.getFrameListenerCount(),
        this.engine.getPlayingFrameListenerCount(),
      );
      profileGameLoopEnd(loopStartedAt);
    }

    this.scheduleFrame();
  };
}
