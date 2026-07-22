import { requestStartGame } from '../entities/GameState';
import { resetGame } from '../entities/restart';
import type { GameEngine } from '../engine/GameEngine';

export const RESTART_SYSTEM_ID = 'restart-system';

/** Restart orchestration (stateless — use {@link resetGame} / {@link playAgain}). */
export class RestartSystem {
  readonly id = RESTART_SYSTEM_ID;
}

export { resetGame } from '../entities/restart';

/** Full session reset then transition to `playing` (Play Again). */
export function playAgain(engine: GameEngine): void {
  resetGame(engine);
  requestStartGame(engine);
}
