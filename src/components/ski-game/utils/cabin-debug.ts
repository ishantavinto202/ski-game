import type { SpawnPattern } from '../types/SpawnPatternTypes';
import type { SpawnFootprint } from './spawn-validation';

/** Temporary cabin pipeline instrumentation — remove after debugging. */
export const CABIN_DEBUG_ENABLED = false;

export type CabinDebugCounts = {
  patternsSelected: number;
  validationPassed: number;
  validationFailed: number;
  spawnRequestsCreated: number;
  enqueued: number;
  obstaclesSpawned: number;
  rendered: number;
};

const counts: CabinDebugCounts = {
  patternsSelected: 0,
  validationPassed: 0,
  validationFailed: 0,
  spawnRequestsCreated: 0,
  enqueued: 0,
  obstaclesSpawned: 0,
  rendered: 0,
};

const renderedLoggedRequestIds = new Set<number>();

export function patternContainsCabin(pattern: SpawnPattern): boolean {
  const obstacles = pattern.obstacles;
  for (let index = 0; index < obstacles.length; index += 1) {
    if (obstacles[index].variant === 'cabin') {
      return true;
    }
  }
  return false;
}

export function formatSpawnFootprint(footprint: SpawnFootprint): string {
  return JSON.stringify({
    minLane: footprint.minLane,
    maxLane: footprint.maxLane,
    minWorldX: footprint.minWorldX,
    maxWorldX: footprint.maxWorldX,
    minWorldY: footprint.minWorldY,
    maxWorldY: footprint.maxWorldY,
  });
}

export function resetCabinDebugCounters(): void {
  counts.patternsSelected = 0;
  counts.validationPassed = 0;
  counts.validationFailed = 0;
  counts.spawnRequestsCreated = 0;
  counts.enqueued = 0;
  counts.obstaclesSpawned = 0;
  counts.rendered = 0;
  renderedLoggedRequestIds.clear();
}

export function readCabinDebugCounts(): Readonly<CabinDebugCounts> {
  return counts;
}

export function logCabinPatternSelected(patternId: string, attemptNumber: number): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.patternsSelected += 1;
  console.log('[CABIN] Pattern Selected', { patternId, attemptNumber });
}

export function logCabinValidationPassed(originY: number, footprint: SpawnFootprint): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.validationPassed += 1;
  console.log('[CABIN] Validation Passed', { originY, footprint: formatSpawnFootprint(footprint) });
}

export function logCabinValidationFailed(
  startOriginY: number,
  footprint: SpawnFootprint,
  reason: string,
): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.validationFailed += 1;
  console.log('[CABIN] Validation Failed', {
    startOriginY,
    footprint: formatSpawnFootprint(footprint),
    reason,
  });
}

export function logCabinEnqueued(): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.enqueued += 1;
  console.log('[CABIN] Enqueued');
}

export function logCabinSpawnRequestCreated(): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.spawnRequestsCreated += 1;
}

export function logCabinSpawned(worldX: number, worldY: number): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  counts.obstaclesSpawned += 1;
  console.log('[CABIN] Spawned', { worldX, worldY });
}

export function logCabinRenderedOnce(spawnRequestId: number, screenX: number, screenY: number): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  if (renderedLoggedRequestIds.has(spawnRequestId)) {
    return;
  }
  renderedLoggedRequestIds.add(spawnRequestId);
  counts.rendered += 1;
  console.log('[CABIN] Rendered', { screenX, screenY, spawnRequestId });
}

export function logCabinDebugSummary(): void {
  if (!CABIN_DEBUG_ENABLED) {
    return;
  }
  const snapshot = readCabinDebugCounts();
  console.log(
    [
      '[CABIN] Debug summary',
      `Cabin Patterns Selected: ${snapshot.patternsSelected}`,
      `Validation Passed: ${snapshot.validationPassed}`,
      `Validation Failed: ${snapshot.validationFailed}`,
      `Spawn Requests Created: ${snapshot.spawnRequestsCreated}`,
      `Enqueued (cabin patterns): ${snapshot.enqueued}`,
      `Obstacles Spawned: ${snapshot.obstaclesSpawned}`,
      `Rendered: ${snapshot.rendered}`,
    ].join('\n'),
  );
}
