import type { GameEngine } from '../engine/GameEngine';

export interface GameSystem {
  readonly id: string;
  mount(engine: GameEngine): void;
  unmount(): void;
  fixedUpdate?(fixedDeltaMs: number): void;
}
