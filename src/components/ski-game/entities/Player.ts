import { GAME_CONFIG } from '../utils/GameConfig';

export type PlayerSnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class Player {
  readonly id = 'player' as const;

  x: number;
  y: number;
  readonly width: number;
  readonly height: number;

  constructor(snapshot: PlayerSnapshot) {
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.width = snapshot.width;
    this.height = snapshot.height;
  }

  toSnapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

export function createPlayerForViewport(
  viewportWidth: number,
  viewportHeight: number,
): Player {
  const { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_START_X, PLAYER_START_Y } = GAME_CONFIG;

  const x = viewportWidth * PLAYER_START_X - PLAYER_WIDTH / 2;
  const y = viewportHeight * PLAYER_START_Y - PLAYER_HEIGHT / 2;

  return new Player({
    x,
    y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  });
}
