import type { ObstaclePoolState, ObstacleVariant } from '../types/ObstacleTypes';
import { OBSTACLE_VARIANT_DIMENSIONS } from '../types/ObstacleTypes';
import type { SpawnRequest } from '../types/SpawnTypes';
import { GAME_CONFIG } from './GameConfig';

const MAX_PATTERN_ACCEPTED = 8;

const PLAYER_COLLISION_WIDTH =
  GAME_CONFIG.PLAYER_WIDTH - 2 * GAME_CONFIG.PLAYER_COLLISION_PADDING;
const PLAYER_COLLISION_HEIGHT =
  GAME_CONFIG.PLAYER_HEIGHT - 2 * GAME_CONFIG.PLAYER_COLLISION_PADDING;

const MIN_HORIZONTAL_PASSABLE_GAP =
  PLAYER_COLLISION_WIDTH + GAME_CONFIG.OBSTACLE_PASSAGE_SAFETY_MARGIN;
const MIN_VERTICAL_PASSABLE_GAP =
  PLAYER_COLLISION_HEIGHT + GAME_CONFIG.OBSTACLE_VERTICAL_SAFETY_MARGIN;

const MAX_PASSAGE_SCAN_PADDING = Math.max(
  MIN_HORIZONTAL_PASSABLE_GAP,
  MIN_VERTICAL_PASSABLE_GAP,
);

const patternAcceptedX = new Float64Array(MAX_PATTERN_ACCEPTED);
const patternAcceptedY = new Float64Array(MAX_PATTERN_ACCEPTED);
const patternAcceptedW = new Float64Array(MAX_PATTERN_ACCEPTED);
const patternAcceptedH = new Float64Array(MAX_PATTERN_ACCEPTED);

export function resolveMinimumHorizontalPassableGap(): number {
  return MIN_HORIZONTAL_PASSABLE_GAP;
}

export function resolveMinimumVerticalPassableGap(): number {
  return MIN_VERTICAL_PASSABLE_GAP;
}

/** @deprecated Use passage-based clearance; kept for callers expecting a numeric margin. */
export function resolveObstaclePairClearance(
  _variantA: ObstacleVariant,
  _variantB: ObstacleVariant,
): number {
  return MIN_HORIZONTAL_PASSABLE_GAP;
}

/**
 * Returns true when obstacle gameplay footprints do not overlap and every
 * navigable gap is wide enough for the player collision body.
 */
export function hasObstaclePassageClearance(
  candidateX: number,
  candidateY: number,
  candidateWidth: number,
  candidateHeight: number,
  otherX: number,
  otherY: number,
  otherWidth: number,
  otherHeight: number,
): boolean {
  const candidateHalfW = candidateWidth * 0.5;
  const candidateHalfH = candidateHeight * 0.5;
  const otherHalfW = otherWidth * 0.5;
  const otherHalfH = otherHeight * 0.5;

  const candidateLeft = candidateX - candidateHalfW;
  const candidateRight = candidateX + candidateHalfW;
  const candidateTop = candidateY - candidateHalfH;
  const candidateBottom = candidateY + candidateHalfH;

  const otherLeft = otherX - otherHalfW;
  const otherRight = otherX + otherHalfW;
  const otherTop = otherY - otherHalfH;
  const otherBottom = otherY + otherHalfH;

  if (
    candidateRight > otherLeft &&
    candidateLeft < otherRight &&
    candidateBottom > otherTop &&
    candidateTop < otherBottom
  ) {
    return false;
  }

  const yRangesOverlap = candidateBottom > otherTop && candidateTop < otherBottom;
  const xRangesOverlap = candidateRight > otherLeft && candidateLeft < otherRight;

  if (yRangesOverlap) {
    if (candidateRight <= otherLeft) {
      if (otherLeft - candidateRight < MIN_HORIZONTAL_PASSABLE_GAP) {
        return false;
      }
    } else if (candidateLeft >= otherRight) {
      if (candidateLeft - otherRight < MIN_HORIZONTAL_PASSABLE_GAP) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (xRangesOverlap) {
    if (candidateBottom <= otherTop) {
      if (otherTop - candidateBottom < MIN_VERTICAL_PASSABLE_GAP) {
        return false;
      }
    } else if (candidateTop >= otherBottom) {
      if (candidateTop - otherBottom < MIN_VERTICAL_PASSABLE_GAP) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (!yRangesOverlap && !xRangesOverlap) {
    const horizontalGap =
      candidateRight <= otherLeft
        ? otherLeft - candidateRight
        : candidateLeft >= otherRight
          ? candidateLeft - otherRight
          : 0;
    const verticalGap =
      candidateBottom <= otherTop
        ? otherTop - candidateBottom
        : candidateTop >= otherBottom
          ? candidateTop - otherBottom
          : 0;

    if (
      horizontalGap > 0 &&
      verticalGap > 0 &&
      horizontalGap < MIN_HORIZONTAL_PASSABLE_GAP &&
      verticalGap < MIN_VERTICAL_PASSABLE_GAP
    ) {
      return false;
    }
  }

  return true;
}

/** Alias for passage clearance — expanded-rect API retained for existing imports. */
export function hasObstacleClearance(
  candidateX: number,
  candidateY: number,
  candidateWidth: number,
  candidateHeight: number,
  otherX: number,
  otherY: number,
  otherWidth: number,
  otherHeight: number,
  _clearance: number,
): boolean {
  return hasObstaclePassageClearance(
    candidateX,
    candidateY,
    candidateWidth,
    candidateHeight,
    otherX,
    otherY,
    otherWidth,
    otherHeight,
  );
}

function isVerticalScanBandDisjoint(
  candidateY: number,
  candidateHeight: number,
  otherY: number,
  otherHeight: number,
  scanPadding: number,
): boolean {
  const candidateTop = candidateY - candidateHeight * 0.5 - scanPadding;
  const candidateBottom = candidateY + candidateHeight * 0.5 + scanPadding;
  const otherTop = otherY - otherHeight * 0.5;
  const otherBottom = otherY + otherHeight * 0.5;
  return candidateBottom <= otherTop || candidateTop >= otherBottom;
}

export function isObstacleSpacingClearAgainstActivePool(
  candidateX: number,
  candidateY: number,
  candidateVariant: ObstacleVariant,
  obstaclePool: ObstaclePoolState,
): boolean {
  const candidateDimensions = OBSTACLE_VARIANT_DIMENSIONS[candidateVariant];
  const candidateWidth = candidateDimensions.width;
  const candidateHeight = candidateDimensions.height;
  const obstacles = obstaclePool.obstacles;

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active) {
      continue;
    }

    if (
      isVerticalScanBandDisjoint(
        candidateY,
        candidateHeight,
        obstacle.worldY,
        obstacle.height,
        MAX_PASSAGE_SCAN_PADDING,
      )
    ) {
      continue;
    }

    if (
      !hasObstaclePassageClearance(
        candidateX,
        candidateY,
        candidateWidth,
        candidateHeight,
        obstacle.worldX,
        obstacle.worldY,
        obstacle.width,
        obstacle.height,
      )
    ) {
      return false;
    }
  }

  return true;
}

export function isObstacleSpacingClearAgainstPendingRequests(
  candidateX: number,
  candidateY: number,
  candidateVariant: ObstacleVariant,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
): boolean {
  const candidateDimensions = OBSTACLE_VARIANT_DIMENSIONS[candidateVariant];
  const candidateWidth = candidateDimensions.width;
  const candidateHeight = candidateDimensions.height;
  const cappedPending =
    pendingCount < pendingRequests.length ? pendingCount : pendingRequests.length;

  for (let index = 0; index < cappedPending; index += 1) {
    const request = pendingRequests[index];
    if (request.kind !== 'obstacle' || !request.active) {
      continue;
    }

    const otherVariant = request.obstacleVariant ?? 'small_rock';
    const otherDimensions = OBSTACLE_VARIANT_DIMENSIONS[otherVariant];

    if (
      isVerticalScanBandDisjoint(
        candidateY,
        candidateHeight,
        request.worldY,
        otherDimensions.height,
        MAX_PASSAGE_SCAN_PADDING,
      )
    ) {
      continue;
    }

    if (
      !hasObstaclePassageClearance(
        candidateX,
        candidateY,
        candidateWidth,
        candidateHeight,
        request.worldX,
        request.worldY,
        otherDimensions.width,
        otherDimensions.height,
      )
    ) {
      return false;
    }
  }

  return true;
}

export function isObstacleSpacingClearAgainstPatternAccepted(
  candidateX: number,
  candidateY: number,
  candidateVariant: ObstacleVariant,
  acceptedCount: number,
): boolean {
  const candidateDimensions = OBSTACLE_VARIANT_DIMENSIONS[candidateVariant];
  const candidateWidth = candidateDimensions.width;
  const candidateHeight = candidateDimensions.height;

  for (let index = 0; index < acceptedCount; index += 1) {
    if (
      !hasObstaclePassageClearance(
        candidateX,
        candidateY,
        candidateWidth,
        candidateHeight,
        patternAcceptedX[index],
        patternAcceptedY[index],
        patternAcceptedW[index],
        patternAcceptedH[index],
      )
    ) {
      return false;
    }
  }

  return true;
}

export function recordPatternAcceptedObstacleSpacing(
  worldX: number,
  worldY: number,
  variant: ObstacleVariant,
  acceptedCount: number,
): number {
  const dimensions = OBSTACLE_VARIANT_DIMENSIONS[variant];
  const slot = acceptedCount;
  patternAcceptedX[slot] = worldX;
  patternAcceptedY[slot] = worldY;
  patternAcceptedW[slot] = dimensions.width;
  patternAcceptedH[slot] = dimensions.height;
  return acceptedCount + 1;
}

export function resolveObstaclePlacementLaneDelta(attempt: number, entryIndex: number): number {
  if (attempt === 0) {
    return 0;
  }
  if (attempt === 1) {
    return -1;
  }
  if (attempt === 2) {
    return 1;
  }
  return entryIndex % 2 === 0 ? -2 : 2;
}

export function clampPatternLaneIndex(laneIndex: number, laneCount: number): number {
  if (laneIndex < 0) {
    return 0;
  }
  if (laneIndex >= laneCount) {
    return laneCount - 1;
  }
  return laneIndex;
}

export function isObstacleSpawnSpacingValid(
  candidateX: number,
  candidateY: number,
  candidateVariant: ObstacleVariant,
  obstaclePool: ObstaclePoolState,
  pendingRequests: readonly SpawnRequest[],
  pendingCount: number,
  patternAcceptedCount: number,
): boolean {
  if (
    !isObstacleSpacingClearAgainstActivePool(
      candidateX,
      candidateY,
      candidateVariant,
      obstaclePool,
    )
  ) {
    return false;
  }
  if (
    !isObstacleSpacingClearAgainstPendingRequests(
      candidateX,
      candidateY,
      candidateVariant,
      pendingRequests,
      pendingCount,
    )
  ) {
    return false;
  }
  if (
    !isObstacleSpacingClearAgainstPatternAccepted(
      candidateX,
      candidateY,
      candidateVariant,
      patternAcceptedCount,
    )
  ) {
    return false;
  }
  return true;
}

let debugRejectedCount = 0;
let debugRepositionedCount = 0;

export function logObstacleSpacingRejected(
  variant: ObstacleVariant,
  worldX: number,
  worldY: number,
): void {
  if (!GAME_CONFIG.DEBUG_OBSTACLE_SPACING) {
    return;
  }
  debugRejectedCount += 1;
  console.log('[OBSTACLE_SPACING] placement rejected', {
    variant,
    worldX,
    worldY,
    total: debugRejectedCount,
  });
}

export function logObstacleSpacingRepositioned(
  variant: ObstacleVariant,
  originalX: number,
  adjustedX: number,
  worldY: number,
  attempt: number,
): void {
  if (!GAME_CONFIG.DEBUG_OBSTACLE_SPACING) {
    return;
  }
  debugRepositionedCount += 1;
  console.log('[OBSTACLE_SPACING] repositioned', {
    variant,
    originalX,
    adjustedX,
    worldY,
    attempt,
    total: debugRepositionedCount,
  });
}
