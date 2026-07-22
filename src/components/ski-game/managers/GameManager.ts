import { GameEngine } from '../engine/GameEngine';

export class GameManager {
  private engine: GameEngine | null = null;

  createEngine(): GameEngine {
    this.destroyEngine();
    this.engine = new GameEngine();
    return this.engine;
  }

  getEngine(): GameEngine | null {
    return this.engine;
  }

  destroyEngine(): void {
    this.engine?.dispose();
    this.engine = null;
  }
}

export const gameManager = new GameManager();
