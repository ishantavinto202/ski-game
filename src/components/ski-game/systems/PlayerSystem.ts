import { createPlayerForViewport } from '../entities/Player';
import { snapChaserBehindPlayer } from '../entities/Chaser';
import type { GameEngine } from '../engine/GameEngine';
import type { GameSystem } from '../types';

export const PLAYER_SYSTEM_ID = 'player-system';

export class PlayerSystem implements GameSystem {
  readonly id = PLAYER_SYSTEM_ID;

  private engine: GameEngine | null = null;
  private removeViewportListener: (() => void) | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    this.removeViewportListener = engine.onViewportChange(this.handleViewportChange);
    this.ensurePlayerSpawned();
  }

  unmount(): void {
    this.removeViewportListener?.();
    this.removeViewportListener = null;
    if (this.engine) {
      this.engine.playerRef.current = null;
    }
    this.engine = null;
  }

  ensurePlayerSpawned(): void {
    const engine = this.engine;
    if (!engine || engine.playerRef.current) {
      return;
    }

    const viewport = engine.viewportRef.current;
    if (!viewport) {
      return;
    }

    const player = createPlayerForViewport(viewport.width, viewport.height);
    engine.playerRef.current = player;
    snapChaserBehindPlayer(
      engine.chaserRef.current,
      player.x,
      player.y,
      player.width,
      engine.healthRef.current.currentHealth,
    );
  }

  private handleViewportChange = (): void => {
    this.ensurePlayerSpawned();
  };
}
