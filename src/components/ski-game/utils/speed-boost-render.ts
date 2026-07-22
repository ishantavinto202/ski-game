import type { ViewportSize } from '../engine/GameEngine';
import type { SpeedBoostScreenRect } from '../entities/SpeedBoost';

import { GAME_CONFIG } from './GameConfig';

export function isSpeedBoostRectVisible(
  rect: SpeedBoostScreenRect,
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

export function getSpeedBoostRenderMargin(): number {
  return GAME_CONFIG.SPEED_BOOST_RENDER_MARGIN;
}
