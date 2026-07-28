import type { ObstacleVariant } from './ObstacleTypes';

/** Future spawn categories (no entities created by the spawn manager). */
export type SpawnKind = 'obstacle' | 'coin' | 'shield' | 'speed_boost';

export type SpawnRequest = {
  id: number;
  kind: SpawnKind;
  worldX: number;
  worldY: number;
  laneIndex: number;
  /** Set for patterned obstacle requests; null for other kinds or legacy fallback. */
  obstacleVariant: ObstacleVariant | null;
  active: boolean;
};

export type SpawnManagerState = {
  elapsedSinceLastSpawnMs: number;
  pendingCount: number;
  laneCursor: number;
  kindCursor: number;
  nextRequestId: number;
  patternRngState: number;
  /** Increments per population pattern; drives periodic safe single-lane gaps. */
  populationPatternSerial: number;
  /** World Y for the next sequential pattern origin (upstream append cursor). */
  nextPatternOriginY: number;
  populationCursorInitialized: boolean;
  populationLastPatternPlaced: boolean;
  lastPatternOriginY: number;
  /** Consecutive generated groups without meaningful left/right edge pressure. */
  leftEdgeOpenGroups: number;
  rightEdgeOpenGroups: number;
  /** Remaining groups before another forced edge-pressure formation may fire. */
  edgePressureCooldownRemaining: number;
  /** Last forced pressure side: -1 left, 1 right, 0 none yet. */
  lastEdgePressureSide: -1 | 0 | 1;
  laneCount: number;
  laneWidth: number;
  playableOriginX: number;
  requests: SpawnRequest[];
};

/**
 * Deterministic pickup rotation (obstacle slots advance cadence only).
 * Coins appear twice as often as each powerup; shield and speed_boost are independent.
 */
export const SPAWN_KIND_SEQUENCE: readonly SpawnKind[] = [
  'obstacle',
  'coin',
  'obstacle',
  'shield',
  'obstacle',
  'coin',
  'obstacle',
  'speed_boost',
];

export const MAX_PENDING_SPAWN_REQUESTS = 72;

export function createInitialSpawnManagerState(): SpawnManagerState {
  const requests: SpawnRequest[] = new Array(MAX_PENDING_SPAWN_REQUESTS);
  for (let index = 0; index < MAX_PENDING_SPAWN_REQUESTS; index += 1) {
    requests[index] = {
      id: 0,
      kind: 'obstacle',
      worldX: 0,
      worldY: 0,
      laneIndex: 0,
      obstacleVariant: null,
      active: false,
    };
  }

  return {
    elapsedSinceLastSpawnMs: 0,
    pendingCount: 0,
    laneCursor: 0,
    kindCursor: 0,
    nextRequestId: 1,
    patternRngState: 0x7f4a7c15,
    populationPatternSerial: 0,
    nextPatternOriginY: 0,
    populationCursorInitialized: false,
    populationLastPatternPlaced: false,
    lastPatternOriginY: 0,
    leftEdgeOpenGroups: 0,
    rightEdgeOpenGroups: 0,
    edgePressureCooldownRemaining: 0,
    lastEdgePressureSide: 0,
    laneCount: 3,
    laneWidth: 0,
    playableOriginX: 0,
    requests,
  };
}
