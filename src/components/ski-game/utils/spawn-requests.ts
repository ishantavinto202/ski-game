import type { SpawnManagerState } from '../types/SpawnTypes';

/** Marks pending spawn requests as consumed (no allocations). */
export function clearPendingSpawnRequests(spawnState: SpawnManagerState): void {
  const count = spawnState.pendingCount;
  for (let index = 0; index < count; index += 1) {
    spawnState.requests[index].active = false;
  }
  spawnState.pendingCount = 0;
}
