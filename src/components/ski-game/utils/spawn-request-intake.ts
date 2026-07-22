import type { GameEngine } from '../engine/GameEngine';
import type { SpawnRequest } from '../types/SpawnTypes';
import { worldYCenterToScreenY } from './world-coordinates';

/** Drop queued spawns whose world Y is already past the below-viewport despawn line. */
export function isSpawnRequestPastDespawn(
  engine: GameEngine,
  worldY: number,
  despawnMargin: number,
): boolean {
  const viewport = engine.viewportRef.current;
  if (!viewport) {
    return false;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const despawnScreenY = viewport.height + despawnMargin;
  const screenY = worldYCenterToScreenY(scrollOffsetY, worldY);
  return screenY > despawnScreenY;
}

export function retainFailedSpawnRequest(
  requests: SpawnRequest[],
  writeIndex: number,
  readIndex: number,
  request: SpawnRequest,
): number {
  if (writeIndex !== readIndex) {
    requests[writeIndex] = request;
  }
  return writeIndex + 1;
}
