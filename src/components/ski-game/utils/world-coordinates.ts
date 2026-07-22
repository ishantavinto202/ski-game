import type { GameEngine } from '../engine/GameEngine';

import { GAME_CONFIG } from './GameConfig';

/** Screen Y for a world-space point (0 = top of viewport). */
export function worldYToScreenY(engine: GameEngine, worldY: number): number {
  return engine.worldRef.current.scrollOffsetY - worldY;
}

export function screenYToWorldY(engine: GameEngine, screenY: number): number {
  return engine.worldRef.current.scrollOffsetY - screenY;
}

/** World Y for spawning ahead of the visible area (above the top edge). */
export function spawnWorldYAboveViewport(engine: GameEngine, offsetPx: number): number {
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  return scrollOffsetY + offsetPx;
}

/**
 * Suggested upstream spawn offset (px) using look-ahead ratio and live viewport height.
 */
export function spawnLookAheadOffsetPx(engine: GameEngine): number {
  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return 0;
  }
  return viewport.height * GAME_CONFIG.LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO;
}

/** World Y at the bottom edge of the viewport in world space. */
export function viewportBottomWorldY(engine: GameEngine): number {
  const viewport = engine.viewportRef.current;
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  if (!viewport) {
    return scrollOffsetY;
  }
  return scrollOffsetY - viewport.height;
}

/** Center anchor in screen space from scroll + world Y. */
export function worldYCenterToScreenY(scrollOffsetY: number, worldY: number): number {
  return scrollOffsetY - worldY;
}
