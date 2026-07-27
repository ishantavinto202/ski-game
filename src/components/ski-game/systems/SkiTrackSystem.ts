import type { GameEngine } from '../engine/GameEngine';
import type { GameSystem } from '../types';
import { tickSkiTrackSampling } from '../effects/SkiTrack';

export const SKI_TRACK_SYSTEM_ID = 'ski-track-system';

/** Samples player + chaser ski tracks (visual only). Runs after ChaserSystem. */
export class SkiTrackSystem implements GameSystem {
  readonly id = SKI_TRACK_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
  }

  unmount(): void {
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    tickSkiTrackSampling(engine, fixedDeltaMs);
  }
}
