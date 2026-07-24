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

/** Copy spawn row on compact so pending slots never alias the same object. */
export function cloneSpawnRequest(request: SpawnRequest): SpawnRequest {
  return {
    id: request.id,
    kind: request.kind,
    worldX: request.worldX,
    worldY: request.worldY,
    laneIndex: request.laneIndex,
    obstacleVariant: request.obstacleVariant,
    active: request.active,
  };
}

export function copySpawnRequestToWriteIndex(
  requests: SpawnRequest[],
  writeIndex: number,
  readIndex: number,
  request: SpawnRequest,
): void {
  if (writeIndex === readIndex) {
    return;
  }
  requests[writeIndex] = cloneSpawnRequest(request);
}

export function retainFailedSpawnRequest(
  requests: SpawnRequest[],
  writeIndex: number,
  readIndex: number,
  request: SpawnRequest,
): number {
  copySpawnRequestToWriteIndex(requests, writeIndex, readIndex, request);
  return writeIndex + 1;
}
