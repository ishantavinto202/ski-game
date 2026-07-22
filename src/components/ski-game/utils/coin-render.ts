import type { ViewportSize } from '../engine/GameEngine';
import type { CoinScreenRect } from '../entities/Coin';

import { GAME_CONFIG } from './GameConfig';

export function isCoinRectVisible(
  rect: CoinScreenRect,
  viewport: ViewportSize,
  margin: number,
): boolean {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  if (right < -margin) {
    return false;
  }
  if (rect.left > viewport.width + margin) {
    return false;
  }
  if (bottom < -margin) {
    return false;
  }
  if (rect.top > viewport.height + margin) {
    return false;
  }

  return true;
}

export function getCoinRenderMargin(): number {
  return GAME_CONFIG.COIN_RENDER_MARGIN;
}
