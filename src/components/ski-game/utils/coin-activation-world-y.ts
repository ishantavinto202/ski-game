import type { GameEngine } from '../engine/GameEngine';
import { COIN_WORLD_SIZE } from '../types/CoinTypes';
import { SHIELD_WORLD_SIZE } from '../types/ShieldTypes';
import { getCoinRenderMargin } from './coin-render';
import { getShieldRenderMargin } from './shield-render';
import { GAME_CONFIG } from './GameConfig';
import { isSpawnRequestPastDespawn } from './spawn-request-intake';
import { worldYCenterToScreenY } from './world-coordinates';

/**
 * Spawn requests store worldY at enqueue time. If intake runs after scroll has
 * advanced, that Y can already be at/below the viewport; re-anchor upstream.
 */
export function resolveCoinActivationWorldY(engine: GameEngine, requestWorldY: number): number {
  const viewport = engine.viewportRef.current;
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  if (!viewport) {
    return requestWorldY;
  }

  if (isSpawnRequestPastDespawn(engine, requestWorldY, GAME_CONFIG.COIN_DESPAWN_MARGIN)) {
    return scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD;
  }

  const screenY = worldYCenterToScreenY(scrollOffsetY, requestWorldY);
  const upstreamVisibleEdgeScreenY = -getCoinRenderMargin() - COIN_WORLD_SIZE.height * 0.5;
  if (screenY > upstreamVisibleEdgeScreenY) {
    return scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD;
  }

  return requestWorldY;
}

export function resolveShieldActivationWorldY(engine: GameEngine, requestWorldY: number): number {
  const viewport = engine.viewportRef.current;
  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  if (!viewport) {
    return requestWorldY;
  }

  if (isSpawnRequestPastDespawn(engine, requestWorldY, GAME_CONFIG.SHIELD_DESPAWN_MARGIN)) {
    return scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD;
  }

  const screenY = worldYCenterToScreenY(scrollOffsetY, requestWorldY);
  const upstreamVisibleEdgeScreenY = -getShieldRenderMargin() - SHIELD_WORLD_SIZE.height * 0.5;
  if (screenY > upstreamVisibleEdgeScreenY) {
    return scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD;
  }

  return requestWorldY;
}
