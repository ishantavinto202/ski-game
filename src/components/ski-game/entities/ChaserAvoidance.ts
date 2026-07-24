import type { ObstacleRecord } from '../types/ObstacleTypes';
import type { ChaserState } from '../types/ChaserTypes';
import { GAME_CONFIG } from '../utils/GameConfig';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

/** Set true temporarily to diagnose one avoidance decision (never leave on). */
const CHASER_AVOID_DEBUG = false;

/** Clears active avoidance commitment; preserves lastAvoidDirection for hysteresis. */
export function clearChaserAvoidanceState(state: ChaserState): void {
  if (state.avoidDirection !== 0) {
    state.lastAvoidDirection = state.avoidDirection;
  }
  state.avoidObstacleId = 0;
  state.avoidDirection = 0;
}

function clampChaserX(candidateX: number, viewportWidth: number): number {
  const minX = GAME_CONFIG.PLAYER_HORIZONTAL_PADDING;
  const maxX = viewportWidth - GAME_CONFIG.PLAYER_HORIZONTAL_PADDING - GAME_CONFIG.CHASER_WIDTH;
  if (maxX < minX) {
    return minX;
  }
  if (candidateX < minX) {
    return minX;
  }
  if (candidateX > maxX) {
    return maxX;
  }
  return candidateX;
}

function max2(a: number, b: number): number {
  return a > b ? a : b;
}

function absDiff(a: number, b: number): number {
  return a > b ? a - b : b - a;
}

/**
 * Chaser-specific visual avoidance envelope around obstacle center.
 * Does not modify gameplay collision dimensions.
 */
function resolveAvoidanceEnvelope(
  obstacle: ObstacleRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
  outLeft: { v: number },
  outTop: { v: number },
  outRight: { v: number },
  outBottom: { v: number },
): void {
  const centerX = obstacle.worldX - cameraOffsetX;
  const centerY = worldYCenterToScreenY(scrollOffsetY, obstacle.worldY);
  const avoidWidth = max2(obstacle.width, GAME_CONFIG.CHASER_MIN_AVOID_OBSTACLE_WIDTH);
  const avoidHeight = max2(obstacle.height, GAME_CONFIG.CHASER_MIN_AVOID_OBSTACLE_HEIGHT);
  const halfW = avoidWidth * 0.5;
  const halfH = avoidHeight * 0.5;
  outLeft.v = centerX - halfW;
  outRight.v = centerX + halfW;
  outTop.v = centerY - halfH;
  outBottom.v = centerY + halfH;
}

/** Reusable primitive holders — no per-call object allocation in hot path. */
const envALeft = { v: 0 };
const envATop = { v: 0 };
const envARight = { v: 0 };
const envABottom = { v: 0 };
const envBLeft = { v: 0 };
const envBTop = { v: 0 };
const envBRight = { v: 0 };
const envBBottom = { v: 0 };

function horizontalRangesOverlap(
  leftA: number,
  rightA: number,
  leftB: number,
  rightB: number,
  padding: number,
): boolean {
  return leftA - padding < rightB + padding && rightA + padding > leftB - padding;
}

function estimateRequiredLateralPx(
  avoidLeft: number,
  avoidRight: number,
  referenceX: number,
  viewportWidth: number,
): number {
  const leftTarget = clampChaserX(
    avoidLeft - GAME_CONFIG.CHASER_WIDTH - GAME_CONFIG.CHASER_AVOID_PADDING,
    viewportWidth,
  );
  const rightTarget = clampChaserX(
    avoidRight + GAME_CONFIG.CHASER_AVOID_PADDING,
    viewportWidth,
  );
  const leftMove = absDiff(leftTarget, referenceX);
  const rightMove = absDiff(rightTarget, referenceX);
  return leftMove < rightMove ? leftMove : rightMove;
}

function resolveEffectiveLookahead(
  avoidLeft: number,
  avoidRight: number,
  referenceX: number,
  viewportWidth: number,
): number {
  const requiredLateral = estimateRequiredLateralPx(
    avoidLeft,
    avoidRight,
    referenceX,
    viewportWidth,
  );
  return (
    GAME_CONFIG.CHASER_AVOID_LOOKAHEAD +
    requiredLateral * GAME_CONFIG.CHASER_LOOKAHEAD_PER_LATERAL_PX
  );
}

/**
 * Approach window: obstacle is above/near chaser within lookahead, and has not
 * fully cleared past chaser bottom (+ pass margin). Does NOT require body overlap.
 */
function isInApproachWindow(
  avoidTop: number,
  avoidBottom: number,
  chaserTop: number,
  chaserBottom: number,
  lookahead: number,
  passMargin: number,
): boolean {
  if (avoidTop > chaserBottom + passMargin) {
    return false;
  }
  const approachGap = chaserTop - avoidBottom;
  if (approachGap > lookahead) {
    return false;
  }
  return true;
}

function corridorThreatensHorizontal(
  corridorLeft: number,
  corridorRight: number,
  avoidLeft: number,
  avoidRight: number,
  padding: number,
): boolean {
  return horizontalRangesOverlap(
    corridorLeft,
    corridorRight,
    avoidLeft,
    avoidRight,
    padding,
  );
}

function computeAvoidanceTargetX(
  avoidLeft: number,
  avoidRight: number,
  direction: number,
  viewportWidth: number,
): number {
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  const candidateX =
    direction < 0
      ? avoidLeft - GAME_CONFIG.CHASER_WIDTH - padding
      : avoidRight + padding;
  return clampChaserX(candidateX, viewportWidth);
}

function candidateClearsEnvelope(
  candidateX: number,
  avoidLeft: number,
  avoidRight: number,
  padding: number,
): boolean {
  const chaserRight = candidateX + GAME_CONFIG.CHASER_WIDTH;
  if (chaserRight + padding <= avoidLeft) {
    return true;
  }
  if (candidateX >= avoidRight + padding) {
    return true;
  }
  return false;
}

function measureCandidateClearance(
  candidateX: number,
  chaserTop: number,
  chaserBottom: number,
  primaryObstacleId: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  obstacles: ObstacleRecord[],
  referenceX: number,
  viewportWidth: number,
  passMargin: number,
): number {
  let minGap = Number.POSITIVE_INFINITY;
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  const chaserRight = candidateX + GAME_CONFIG.CHASER_WIDTH;

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active || obstacle.id === primaryObstacleId) {
      continue;
    }

    resolveAvoidanceEnvelope(
      obstacle,
      scrollOffsetY,
      cameraOffsetX,
      envBLeft,
      envBTop,
      envBRight,
      envBBottom,
    );

    const lookahead = resolveEffectiveLookahead(
      envBLeft.v,
      envBRight.v,
      referenceX,
      viewportWidth,
    );

    if (
      !isInApproachWindow(
        envBTop.v,
        envBBottom.v,
        chaserTop,
        chaserBottom,
        lookahead,
        passMargin,
      )
    ) {
      continue;
    }

    if (!candidateClearsEnvelope(candidateX, envBLeft.v, envBRight.v, padding)) {
      return 0;
    }

    let gap = Number.POSITIVE_INFINITY;
    if (chaserRight <= envBLeft.v) {
      gap = envBLeft.v - chaserRight;
    } else if (candidateX >= envBRight.v) {
      gap = candidateX - envBRight.v;
    }

    if (gap < minGap) {
      minGap = gap;
    }
  }

  return minGap;
}

function findActiveObstacleById(
  obstacles: ObstacleRecord[],
  obstacleId: number,
): ObstacleRecord | null {
  if (obstacleId <= 0) {
    return null;
  }

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (obstacle.active && obstacle.id === obstacleId) {
      return obstacle;
    }
  }

  return null;
}

function obstacleEnvelopeHasPassedChaser(
  avoidTop: number,
  chaserBottom: number,
  passMargin: number,
): boolean {
  return avoidTop > chaserBottom + passMargin;
}

function resolveApproachUrgency(
  avoidTop: number,
  avoidBottom: number,
  chaserTop: number,
  chaserBottom: number,
): number {
  const chaserCenterY = chaserTop + GAME_CONFIG.CHASER_HEIGHT * 0.5;
  const obstacleCenterY = (avoidTop + avoidBottom) * 0.5;
  const centerDistance = absDiff(obstacleCenterY, chaserCenterY);
  const approachDistance =
    avoidBottom <= chaserTop ? chaserTop - avoidBottom : centerDistance;
  return approachDistance < centerDistance ? approachDistance : centerDistance;
}

/**
 * Nearest non-primary obstacle already in the local approach region.
 * One-step foresight only — not pathfinding.
 */
function findSecondaryThreatId(
  obstacles: ObstacleRecord[],
  primaryObstacleId: number,
  chaserTop: number,
  chaserBottom: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  referenceX: number,
  viewportWidth: number,
  passMargin: number,
  leftTarget: number,
  rightTarget: number,
): number {
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  let secondaryId = 0;
  let secondaryUrgency = Number.POSITIVE_INFINITY;

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active || obstacle.id === primaryObstacleId) {
      continue;
    }

    resolveAvoidanceEnvelope(
      obstacle,
      scrollOffsetY,
      cameraOffsetX,
      envBLeft,
      envBTop,
      envBRight,
      envBBottom,
    );

    const lookahead = resolveEffectiveLookahead(
      envBLeft.v,
      envBRight.v,
      referenceX,
      viewportWidth,
    );

    if (
      !isInApproachWindow(
        envBTop.v,
        envBBottom.v,
        chaserTop,
        chaserBottom,
        lookahead,
        passMargin,
      )
    ) {
      continue;
    }

    const leftConflicts = !candidateClearsEnvelope(
      leftTarget,
      envBLeft.v,
      envBRight.v,
      padding,
    );
    const rightConflicts = !candidateClearsEnvelope(
      rightTarget,
      envBLeft.v,
      envBRight.v,
      padding,
    );

    if (!leftConflicts && !rightConflicts) {
      continue;
    }

    const urgency = resolveApproachUrgency(
      envBTop.v,
      envBBottom.v,
      chaserTop,
      chaserBottom,
    );
    if (urgency < secondaryUrgency) {
      secondaryUrgency = urgency;
      secondaryId = obstacle.id;
    }
  }

  return secondaryId;
}

function secondarySidePreference(
  secondaryId: number,
  obstacles: ObstacleRecord[],
  leftTarget: number,
  rightTarget: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
): number {
  if (secondaryId <= 0) {
    return 0;
  }

  const secondary = findActiveObstacleById(obstacles, secondaryId);
  if (!secondary) {
    return 0;
  }

  resolveAvoidanceEnvelope(
    secondary,
    scrollOffsetY,
    cameraOffsetX,
    envBLeft,
    envBTop,
    envBRight,
    envBBottom,
  );

  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  const leftOk = candidateClearsEnvelope(leftTarget, envBLeft.v, envBRight.v, padding);
  const rightOk = candidateClearsEnvelope(rightTarget, envBLeft.v, envBRight.v, padding);

  if (leftOk && !rightOk) {
    return -1;
  }
  if (rightOk && !leftOk) {
    return 1;
  }
  return 0;
}

function isDirectionSafeForObstacle(
  direction: number,
  avoidLeft: number,
  avoidRight: number,
  viewportWidth: number,
  chaserTop: number,
  chaserBottom: number,
  primaryObstacleId: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  obstacles: ObstacleRecord[],
  referenceX: number,
  passMargin: number,
): boolean {
  const targetX = computeAvoidanceTargetX(avoidLeft, avoidRight, direction, viewportWidth);
  if (
    !candidateClearsEnvelope(
      targetX,
      avoidLeft,
      avoidRight,
      GAME_CONFIG.CHASER_AVOID_PADDING,
    )
  ) {
    return false;
  }
  return (
    measureCandidateClearance(
      targetX,
      chaserTop,
      chaserBottom,
      primaryObstacleId,
      scrollOffsetY,
      cameraOffsetX,
      obstacles,
      referenceX,
      viewportWidth,
      passMargin,
    ) > 0
  );
}

/**
 * Side priority:
 * 1) clear primary
 * 2) avoid immediate secondary
 * 3) preserve preferred direction (with clearance hysteresis)
 * 4) greater clearance
 * 5) shorter move from player-follow route
 */
function selectAvoidDirection(
  referenceX: number,
  avoidLeft: number,
  avoidRight: number,
  viewportWidth: number,
  chaserTop: number,
  chaserBottom: number,
  primaryObstacleId: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  obstacles: ObstacleRecord[],
  preferredDirection: number,
  passMargin: number,
): number {
  const leftTarget = computeAvoidanceTargetX(avoidLeft, avoidRight, -1, viewportWidth);
  const rightTarget = computeAvoidanceTargetX(avoidLeft, avoidRight, 1, viewportWidth);
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;

  const leftClearsPrimary = candidateClearsEnvelope(leftTarget, avoidLeft, avoidRight, padding);
  const rightClearsPrimary = candidateClearsEnvelope(rightTarget, avoidLeft, avoidRight, padding);

  const leftClearance = leftClearsPrimary
    ? measureCandidateClearance(
        leftTarget,
        chaserTop,
        chaserBottom,
        primaryObstacleId,
        scrollOffsetY,
        cameraOffsetX,
        obstacles,
        referenceX,
        viewportWidth,
        passMargin,
      )
    : 0;
  const rightClearance = rightClearsPrimary
    ? measureCandidateClearance(
        rightTarget,
        chaserTop,
        chaserBottom,
        primaryObstacleId,
        scrollOffsetY,
        cameraOffsetX,
        obstacles,
        referenceX,
        viewportWidth,
        passMargin,
      )
    : 0;

  const leftMove = absDiff(leftTarget, referenceX);
  const rightMove = absDiff(rightTarget, referenceX);
  const leftValid = leftClearsPrimary && leftClearance > 0;
  const rightValid = rightClearsPrimary && rightClearance > 0;

  const secondaryId = findSecondaryThreatId(
    obstacles,
    primaryObstacleId,
    chaserTop,
    chaserBottom,
    scrollOffsetY,
    cameraOffsetX,
    referenceX,
    viewportWidth,
    passMargin,
    leftTarget,
    rightTarget,
  );
  const secondaryPrefer = secondarySidePreference(
    secondaryId,
    obstacles,
    leftTarget,
    rightTarget,
    scrollOffsetY,
    cameraOffsetX,
  );

  let selected = 0;
  let reason = 'fallback';

  if (leftValid && rightValid) {
    if (secondaryPrefer === -1) {
      selected = -1;
      reason = 'secondary-left';
    } else if (secondaryPrefer === 1) {
      selected = 1;
      reason = 'secondary-right';
    } else if (preferredDirection === -1) {
      const advantage = rightClearance - leftClearance;
      if (advantage >= GAME_CONFIG.CHASER_REVERSAL_CLEARANCE_ADVANTAGE) {
        selected = 1;
        reason = 'reversal-advantage';
      } else {
        selected = -1;
        reason = 'prefer-left';
      }
    } else if (preferredDirection === 1) {
      const advantage = leftClearance - rightClearance;
      if (advantage >= GAME_CONFIG.CHASER_REVERSAL_CLEARANCE_ADVANTAGE) {
        selected = -1;
        reason = 'reversal-advantage';
      } else {
        selected = 1;
        reason = 'prefer-right';
      }
    } else if (leftClearance > rightClearance) {
      selected = -1;
      reason = 'clearance-left';
    } else if (rightClearance > leftClearance) {
      selected = 1;
      reason = 'clearance-right';
    } else {
      selected = leftMove <= rightMove ? -1 : 1;
      reason = 'shorter-move';
    }
  } else if (leftValid) {
    selected = -1;
    reason = 'only-left';
  } else if (rightValid) {
    selected = 1;
    reason = 'only-right';
  } else if (leftClearsPrimary && (!rightClearsPrimary || leftClearance >= rightClearance)) {
    selected = -1;
    reason = 'best-effort-left';
  } else {
    selected = 1;
    reason = 'best-effort-right';
  }

  if (CHASER_AVOID_DEBUG) {
    // Development-only: flip CHASER_AVOID_DEBUG to diagnose one decision.
    // eslint-disable-next-line no-console
    console.log(
      '[ChaserAvoid] primary=',
      primaryObstacleId,
      'pref=',
      preferredDirection,
      'Lclr=',
      leftClearance,
      'Rclr=',
      rightClearance,
      'sec=',
      secondaryId,
      'secPref=',
      secondaryPrefer,
      'sel=',
      selected,
      'reason=',
      reason,
    );
  }

  return selected;
}

/**
 * Prevents re-entry: if path follow corridor would hit a nearby envelope
 * but Chaser currently clears it, hold current X until safe.
 */
function resolveSafeFollowTargetX(
  chaserX: number,
  followTargetX: number,
  chaserTop: number,
  viewportWidth: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  obstacles: ObstacleRecord[],
): number {
  const chaserBottom = chaserTop + GAME_CONFIG.CHASER_HEIGHT;
  const passMargin = GAME_CONFIG.CHASER_AVOID_PASS_MARGIN;
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  const followRight = followTargetX + GAME_CONFIG.CHASER_WIDTH;
  const chaserRight = chaserX + GAME_CONFIG.CHASER_WIDTH;

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active) {
      continue;
    }

    resolveAvoidanceEnvelope(
      obstacle,
      scrollOffsetY,
      cameraOffsetX,
      envALeft,
      envATop,
      envARight,
      envABottom,
    );

    const lookahead = resolveEffectiveLookahead(
      envALeft.v,
      envARight.v,
      followTargetX,
      viewportWidth,
    );

    if (
      !isInApproachWindow(
        envATop.v,
        envABottom.v,
        chaserTop,
        chaserBottom,
        lookahead,
        passMargin,
      )
    ) {
      continue;
    }

    const followThreat = corridorThreatensHorizontal(
      followTargetX,
      followRight,
      envALeft.v,
      envARight.v,
      padding,
    );
    const currentClear = !corridorThreatensHorizontal(
      chaserX,
      chaserRight,
      envALeft.v,
      envARight.v,
      padding,
    );

    if (followThreat && currentClear) {
      return chaserX;
    }
  }

  return followTargetX;
}

/**
 * Resolves chaser screen X with local visual obstacle steering.
 * Allocation-free — indexed loops and primitive bounds only.
 */
export function resolveChaserHorizontalTargetX(
  chaser: ChaserState,
  followTargetX: number,
  chaserTop: number,
  viewportWidth: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  obstacles: ObstacleRecord[],
): number {
  const chaserBottom = chaserTop + GAME_CONFIG.CHASER_HEIGHT;
  const passMargin = GAME_CONFIG.CHASER_AVOID_PASS_MARGIN;
  const padding = GAME_CONFIG.CHASER_AVOID_PADDING;
  const chaserX = chaser.x;
  const chaserRight = chaserX + GAME_CONFIG.CHASER_WIDTH;
  const followRight = followTargetX + GAME_CONFIG.CHASER_WIDTH;

  const committed = findActiveObstacleById(obstacles, chaser.avoidObstacleId);
  if (committed) {
    resolveAvoidanceEnvelope(
      committed,
      scrollOffsetY,
      cameraOffsetX,
      envALeft,
      envATop,
      envARight,
      envABottom,
    );

    if (obstacleEnvelopeHasPassedChaser(envATop.v, chaserBottom, passMargin)) {
      clearChaserAvoidanceState(chaser);
    }
  } else if (chaser.avoidObstacleId > 0) {
    clearChaserAvoidanceState(chaser);
  }

  let primaryId = 0;
  let primaryLeft = 0;
  let primaryRight = 0;
  let primaryUrgency = Number.POSITIVE_INFINITY;

  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    if (!obstacle.active) {
      continue;
    }

    resolveAvoidanceEnvelope(
      obstacle,
      scrollOffsetY,
      cameraOffsetX,
      envALeft,
      envATop,
      envARight,
      envABottom,
    );

    const lookahead = resolveEffectiveLookahead(
      envALeft.v,
      envARight.v,
      followTargetX,
      viewportWidth,
    );

    if (
      !isInApproachWindow(
        envATop.v,
        envABottom.v,
        chaserTop,
        chaserBottom,
        lookahead,
        passMargin,
      )
    ) {
      continue;
    }

    const threatensFollow = corridorThreatensHorizontal(
      followTargetX,
      followRight,
      envALeft.v,
      envARight.v,
      padding,
    );
    const imminentOverlap = corridorThreatensHorizontal(
      chaserX,
      chaserRight,
      envALeft.v,
      envARight.v,
      padding,
    );

    if (!threatensFollow && !imminentOverlap) {
      continue;
    }

    const urgency = resolveApproachUrgency(
      envATop.v,
      envABottom.v,
      chaserTop,
      chaserBottom,
    );

    if (urgency < primaryUrgency) {
      primaryUrgency = urgency;
      primaryId = obstacle.id;
      primaryLeft = envALeft.v;
      primaryRight = envARight.v;
    }
  }

  if (primaryId <= 0) {
    return resolveSafeFollowTargetX(
      chaserX,
      followTargetX,
      chaserTop,
      viewportWidth,
      scrollOffsetY,
      cameraOffsetX,
      obstacles,
    );
  }

  if (
    chaser.avoidObstacleId > 0 &&
    chaser.avoidObstacleId !== primaryId &&
    chaser.avoidDirection !== 0
  ) {
    if (
      isDirectionSafeForObstacle(
        chaser.avoidDirection,
        primaryLeft,
        primaryRight,
        viewportWidth,
        chaserTop,
        chaserBottom,
        primaryId,
        scrollOffsetY,
        cameraOffsetX,
        obstacles,
        followTargetX,
        passMargin,
      )
    ) {
      chaser.avoidObstacleId = primaryId;
      return computeAvoidanceTargetX(
        primaryLeft,
        primaryRight,
        chaser.avoidDirection,
        viewportWidth,
      );
    }
  }

  if (chaser.avoidObstacleId === primaryId && chaser.avoidDirection !== 0) {
    return computeAvoidanceTargetX(
      primaryLeft,
      primaryRight,
      chaser.avoidDirection,
      viewportWidth,
    );
  }

  chaser.avoidObstacleId = primaryId;
  chaser.avoidDirection = selectAvoidDirection(
    followTargetX,
    primaryLeft,
    primaryRight,
    viewportWidth,
    chaserTop,
    chaserBottom,
    primaryId,
    scrollOffsetY,
    cameraOffsetX,
    obstacles,
    chaser.lastAvoidDirection,
    passMargin,
  );

  if (chaser.avoidDirection !== 0) {
    chaser.lastAvoidDirection = chaser.avoidDirection;
  }

  return computeAvoidanceTargetX(
    primaryLeft,
    primaryRight,
    chaser.avoidDirection,
    viewportWidth,
  );
}
