import type { GameEngine } from '../engine/GameEngine';
import { resolveScrollSpeedMultiplier } from '../entities/SpeedBoost';
import { createInitialWorldState } from '../types/world-state';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const WORLD_SYSTEM_ID = 'world-system';

export class WorldSystem implements GameSystem {
  readonly id = WORLD_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.worldRef.current = createInitialWorldState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.worldRef.current = createInitialWorldState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const difficultyMultiplier = engine.difficultyRef.current.speedMultiplier;
    const scrollMultiplier = resolveScrollSpeedMultiplier(engine.speedBoostRef.current);
    const scrollStep =
      (GAME_CONFIG.BASE_SCROLL_SPEED * difficultyMultiplier * scrollMultiplier * fixedDeltaMs) / 1000;
    engine.worldRef.current.scrollOffsetY += scrollStep;
  }
}
