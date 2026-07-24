import { GAME_CONFIG } from '../utils/GameConfig';

/**
 * Fixed-capacity ring buffer of Player skiing breadcrumbs in world space.
 * Pre-allocated once — no per-frame allocation.
 */
export type ChaserPathState = {
  /** Player world Y at each breadcrumb (monotonic along the run). */
  worldYs: number[];
  /** Player-follow X (top-left) at each breadcrumb. */
  followXs: number[];
  writeIndex: number;
  count: number;
  /** World Y of the most recent committed breadcrumb. */
  lastSampleWorldY: number;
};

/** Player world Y from scroll + fixed screen anchor. */
export function resolvePlayerWorldY(scrollOffsetY: number, playerScreenY: number): number {
  return scrollOffsetY - playerScreenY;
}

/** Chaser world Y from scroll + chaser screen Y. */
export function resolveChaserWorldY(scrollOffsetY: number, chaserScreenY: number): number {
  return scrollOffsetY - chaserScreenY;
}

/** Pre-allocated once; no runtime allocation in record/lookup. */
export function createChaserPathState(): ChaserPathState {
  const capacity = GAME_CONFIG.CHASER_PATH_BUFFER_CAPACITY;
  const worldYs: number[] = new Array(capacity);
  const followXs: number[] = new Array(capacity);
  for (let index = 0; index < capacity; index += 1) {
    worldYs[index] = 0;
    followXs[index] = 0;
  }
  return {
    worldYs,
    followXs,
    writeIndex: 0,
    count: 0,
    lastSampleWorldY: 0,
  };
}

function writePathSample(path: ChaserPathState, worldY: number, followX: number): void {
  const capacity = GAME_CONFIG.CHASER_PATH_BUFFER_CAPACITY;
  const index = path.writeIndex;
  path.worldYs[index] = worldY;
  path.followXs[index] = followX;
  path.writeIndex = (index + 1) % capacity;
  if (path.count < capacity) {
    path.count += 1;
  }
}

/** Reset on mount / Play Again — seed with current player world position. */
export function resetChaserPathState(
  path: ChaserPathState,
  playerWorldY: number,
  initialFollowX: number,
): void {
  const capacity = GAME_CONFIG.CHASER_PATH_BUFFER_CAPACITY;
  path.writeIndex = 0;
  path.count = 1;
  path.lastSampleWorldY = playerWorldY;
  path.worldYs[0] = playerWorldY;
  path.followXs[0] = initialFollowX;
  for (let index = 1; index < capacity; index += 1) {
    path.worldYs[index] = playerWorldY;
    path.followXs[index] = initialFollowX;
  }
}

/**
 * Record Player breadcrumb by world distance travelled (not elapsed time).
 * Refines the newest breadcrumb's X between spatial samples.
 */
export function recordChaserPathSample(
  path: ChaserPathState,
  playerWorldY: number,
  followX: number,
): void {
  const spacing = GAME_CONFIG.CHASER_PATH_SAMPLE_SPACING;
  const capacity = GAME_CONFIG.CHASER_PATH_BUFFER_CAPACITY;

  if (path.count <= 0) {
    writePathSample(path, playerWorldY, followX);
    path.lastSampleWorldY = playerWorldY;
    return;
  }

  const newestIndex = (path.writeIndex - 1 + capacity) % capacity;
  const deltaWorldY = playerWorldY - path.lastSampleWorldY;

  if (deltaWorldY < spacing) {
    path.followXs[newestIndex] = followX;
    return;
  }

  writePathSample(path, playerWorldY, followX);
  path.lastSampleWorldY = playerWorldY;
}

/**
 * Player-follow X along the recorded path at the Chaser's world Y.
 * Linear interpolation between surrounding breadcrumbs.
 */
export function resolvePathFollowX(path: ChaserPathState, chaserWorldY: number): number {
  const capacity = GAME_CONFIG.CHASER_PATH_BUFFER_CAPACITY;

  if (path.count <= 0) {
    return path.followXs[0];
  }

  const newestIndex = (path.writeIndex - 1 + capacity) % capacity;
  const newestWorldY = path.worldYs[newestIndex];
  const newestX = path.followXs[newestIndex];

  if (path.count === 1) {
    return newestX;
  }

  let oldestIndex = 0;
  if (path.count >= capacity) {
    oldestIndex = path.writeIndex;
  }
  const oldestWorldY = path.worldYs[oldestIndex];
  const oldestX = path.followXs[oldestIndex];

  if (chaserWorldY >= newestWorldY) {
    return newestX;
  }
  if (chaserWorldY <= oldestWorldY) {
    return oldestX;
  }

  for (let step = 0; step < path.count - 1; step += 1) {
    const newerIndex = (newestIndex - step + capacity) % capacity;
    const olderIndex = (newestIndex - step - 1 + capacity) % capacity;
    const newerWorldY = path.worldYs[newerIndex];
    const olderWorldY = path.worldYs[olderIndex];

    if (chaserWorldY >= olderWorldY && chaserWorldY <= newerWorldY) {
      const span = newerWorldY - olderWorldY;
      if (span <= 0) {
        return path.followXs[newerIndex];
      }
      const blend = (chaserWorldY - olderWorldY) / span;
      const olderX = path.followXs[olderIndex];
      const newerX = path.followXs[newerIndex];
      return olderX + (newerX - olderX) * blend;
    }
  }

  return newestX;
}
