import type { GameEngine } from '../engine/GameEngine';
import { SPAWN_PATTERN_LIBRARY } from '../managers/SpawnPatterns';
import { OBSTACLE_VARIANT_DIMENSIONS } from '../types/ObstacleTypes';
import type { SpawnPattern } from '../types/SpawnPatternTypes';
import type { SpawnManagerState } from '../types/SpawnTypes';
import { GAME_CONFIG } from './GameConfig';
import {
  enqueueSpawnPatternRequests,
  pickWeightedSpawnPattern,
  randomIntInclusive,
} from './spawn-patterns';
import { pickForcedCabinPatternIfPending, resetDebugForceCabinState } from './spawn-debug';
import {
  logCabinEnqueued,
  logCabinPatternSelected,
  logCabinValidationFailed,
  logCabinValidationPassed,
  patternContainsCabin,
} from './cabin-debug';
import {
  calculatePatternFootprint,
  findClearPatternOriginY,
  isSpawnAreaOccupied,
} from './spawn-validation';

const SINGLE_ROCK_PATTERN = SPAWN_PATTERN_LIBRARY[0];
const SAFE_PATTERN_EVERY = 4;
const MAX_PATTERN_SELECTION_ATTEMPTS = 5;
const HORIZONTAL_BAND_COUNT = 5;
const MAX_EDGE_OPEN_GROUP_COUNTER = 255;

const LEFT_EDGE_PRESSURE_EARLY: SpawnPattern = {
  id: 'left_edge_pressure_early',
  weight: 0,
  difficulty: 'easy',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 220 },
    { variant: 'small_rock', laneOffset: 1, forwardOffset: 0 },
  ],
};
const RIGHT_EDGE_PRESSURE_EARLY: SpawnPattern = {
  id: 'right_edge_pressure_early',
  weight: 0,
  difficulty: 'easy',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 220 },
    { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
  ],
};
const LEFT_EDGE_PRESSURE_MID: SpawnPattern = {
  id: 'left_edge_pressure_mid',
  weight: 0,
  difficulty: 'medium',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 180 },
    { variant: 'large_boulder', laneOffset: 1, forwardOffset: 0 },
  ],
};
const RIGHT_EDGE_PRESSURE_MID: SpawnPattern = {
  id: 'right_edge_pressure_mid',
  weight: 0,
  difficulty: 'medium',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 180 },
    { variant: 'large_boulder', laneOffset: -1, forwardOffset: 0 },
  ],
};
const LEFT_EDGE_PRESSURE_LATE: SpawnPattern = {
  id: 'left_edge_pressure_late',
  weight: 0,
  difficulty: 'hard',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 360 },
    { variant: 'large_boulder', laneOffset: 1, forwardOffset: 180 },
    { variant: 'tree_stump', laneOffset: 1, forwardOffset: 0 },
  ],
};
const RIGHT_EDGE_PRESSURE_LATE: SpawnPattern = {
  id: 'right_edge_pressure_late',
  weight: 0,
  difficulty: 'hard',
  obstacles: [
    { variant: 'tree', laneOffset: 0, forwardOffset: 360 },
    { variant: 'large_boulder', laneOffset: -1, forwardOffset: 180 },
    { variant: 'tree_stump', laneOffset: -1, forwardOffset: 0 },
  ],
};

function pickPatternCenterLaneIndex(spawnState: SpawnManagerState, laneCount: number): number {
  const bandIndex = randomIntInclusive(spawnState, 0, HORIZONTAL_BAND_COUNT - 1);
  return Math.round((bandIndex * (laneCount - 1)) / (HORIZONTAL_BAND_COUNT - 1));
}

type EdgePressureTarget = -1 | 0 | 1;

function resolveEdgePressurePattern(
  target: Exclude<EdgePressureTarget, 0>,
  currentLevel: number,
): SpawnPattern {
  if (currentLevel >= 8) {
    return target < 0 ? LEFT_EDGE_PRESSURE_LATE : RIGHT_EDGE_PRESSURE_LATE;
  }
  if (currentLevel >= 4) {
    return target < 0 ? LEFT_EDGE_PRESSURE_MID : RIGHT_EDGE_PRESSURE_MID;
  }
  return target < 0 ? LEFT_EDGE_PRESSURE_EARLY : RIGHT_EDGE_PRESSURE_EARLY;
}

function resolveEdgeOpenGroupLimit(currentLevel: number): number {
  if (currentLevel >= 8) {
    return GAME_CONFIG.OBSTACLE_EDGE_OPEN_GROUP_LIMIT_LATE;
  }
  if (currentLevel >= 4) {
    return GAME_CONFIG.OBSTACLE_EDGE_OPEN_GROUP_LIMIT_MID;
  }
  return GAME_CONFIG.OBSTACLE_EDGE_OPEN_GROUP_LIMIT_EARLY;
}

function resolveEdgePressureTarget(
  spawnState: SpawnManagerState,
  currentLevel: number,
): EdgePressureTarget {
  const limit = resolveEdgeOpenGroupLimit(currentLevel);
  const leftOpen = spawnState.leftEdgeOpenGroups;
  const rightOpen = spawnState.rightEdgeOpenGroups;
  const leftDue = leftOpen >= limit;
  const rightDue = rightOpen >= limit;
  const cooldown = GAME_CONFIG.EDGE_PRESSURE_MIN_COOLDOWN_GROUPS;
  const leftCritical = leftOpen >= limit + cooldown;
  const rightCritical = rightOpen >= limit + cooldown;

  if (spawnState.edgePressureCooldownRemaining > 0 && !leftCritical && !rightCritical) {
    return 0;
  }

  if (leftDue && rightDue) {
    if (spawnState.lastEdgePressureSide < 0) {
      return 1;
    }
    if (spawnState.lastEdgePressureSide > 0) {
      return -1;
    }
    return randomIntInclusive(spawnState, 0, 1) === 0 ? -1 : 1;
  }
  if (leftDue) {
    return -1;
  }
  if (rightDue) {
    return 1;
  }
  return 0;
}

function incrementEdgeOpenGroupCounter(value: number): number {
  return value < MAX_EDGE_OPEN_GROUP_COUNTER ? value + 1 : value;
}

function resolveReachablePlayerCenterX(viewportWidth: number, target: EdgePressureTarget): number {
  if (target < 0) {
    return GAME_CONFIG.PLAYER_HORIZONTAL_PADDING + GAME_CONFIG.PLAYER_WIDTH * 0.5;
  }
  return (
    viewportWidth -
    GAME_CONFIG.PLAYER_HORIZONTAL_PADDING -
    GAME_CONFIG.PLAYER_WIDTH * 0.5
  );
}

function isPlayerCenterBlockedAtWorldY(
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
  playerCenterX: number,
  sampleWorldY: number,
): boolean {
  const playerCollisionWidth =
    GAME_CONFIG.PLAYER_WIDTH - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;
  const playerCollisionHeight =
    GAME_CONFIG.PLAYER_HEIGHT - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;

  for (let index = firstRequestIndex; index < spawnState.pendingCount; index += 1) {
    const request = spawnState.requests[index];
    if (!request.active || request.kind !== 'obstacle') {
      continue;
    }
    const dimensions =
      OBSTACLE_VARIANT_DIMENSIONS[request.obstacleVariant ?? 'small_rock'];
    const horizontalLimit =
      (playerCollisionWidth + dimensions.width) * 0.5 +
      GAME_CONFIG.OBSTACLE_PASSAGE_SAFETY_MARGIN * 0.5;
    const verticalLimit =
      (playerCollisionHeight + dimensions.height) * 0.5 +
      GAME_CONFIG.OBSTACLE_VERTICAL_SAFETY_MARGIN;
    if (
      Math.abs(playerCenterX - request.worldX) < horizontalLimit &&
      Math.abs(sampleWorldY - request.worldY) < verticalLimit
    ) {
      return true;
    }
  }
  return false;
}

function hasInteriorEscapeBand(
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
  viewportWidth: number,
  target: Exclude<EdgePressureTarget, 0>,
): boolean {
  const minimumCenter = resolveReachablePlayerCenterX(viewportWidth, -1);
  const maximumCenter = resolveReachablePlayerCenterX(viewportWidth, 1);
  const firstBand = target < 0 ? 1 : 0;
  const lastBand = target < 0 ? HORIZONTAL_BAND_COUNT - 1 : HORIZONTAL_BAND_COUNT - 2;

  for (let sampleIndex = firstRequestIndex; sampleIndex < spawnState.pendingCount; sampleIndex += 1) {
    const sample = spawnState.requests[sampleIndex];
    if (!sample.active || sample.kind !== 'obstacle') {
      continue;
    }

    let hasClearBand = false;
    for (let band = firstBand; band <= lastBand; band += 1) {
      const playerCenterX =
        minimumCenter +
        ((maximumCenter - minimumCenter) * band) / (HORIZONTAL_BAND_COUNT - 1);
      if (
        !isPlayerCenterBlockedAtWorldY(
          spawnState,
          firstRequestIndex,
          playerCenterX,
          sample.worldY,
        )
      ) {
        hasClearBand = true;
        break;
      }
    }
    if (!hasClearBand) {
      return false;
    }
  }
  return true;
}

function resolveRequiredInwardDisplacement(
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
  viewportWidth: number,
  target: Exclude<EdgePressureTarget, 0>,
): number {
  const playerCollisionWidth =
    GAME_CONFIG.PLAYER_WIDTH - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;
  const edgeCenterX = resolveReachablePlayerCenterX(viewportWidth, target);
  let requiredDisplacement = 0;

  for (let index = firstRequestIndex; index < spawnState.pendingCount; index += 1) {
    const request = spawnState.requests[index];
    if (!request.active || request.kind !== 'obstacle') {
      continue;
    }
    const dimensions =
      OBSTACLE_VARIANT_DIMENSIONS[request.obstacleVariant ?? 'small_rock'];
    const horizontalLimit =
      (playerCollisionWidth + dimensions.width) * 0.5 +
      GAME_CONFIG.OBSTACLE_PASSAGE_SAFETY_MARGIN * 0.5;
    if (Math.abs(edgeCenterX - request.worldX) >= horizontalLimit) {
      continue;
    }
    const displacement =
      target < 0
        ? request.worldX + horizontalLimit - edgeCenterX
        : edgeCenterX - (request.worldX - horizontalLimit);
    if (displacement > requiredDisplacement) {
      requiredDisplacement = displacement;
    }
  }
  return requiredDisplacement;
}

function isMeaningfulEdgePressureFormation(
  engine: GameEngine,
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
  target: Exclude<EdgePressureTarget, 0>,
): boolean {
  const viewport = engine.viewportRef.current;
  if (!viewport || spawnState.pendingCount - firstRequestIndex < 2) {
    return false;
  }
  return (
    resolveRequiredInwardDisplacement(
      spawnState,
      firstRequestIndex,
      viewport.width,
      target,
    ) >= GAME_CONFIG.EDGE_PRESSURE_MIN_INWARD_CLEARANCE &&
    hasInteriorEscapeBand(spawnState, firstRequestIndex, viewport.width, target)
  );
}

function rollbackGeneratedRequests(
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
): void {
  const removedCount = spawnState.pendingCount - firstRequestIndex;
  for (let index = firstRequestIndex; index < spawnState.pendingCount; index += 1) {
    spawnState.requests[index].active = false;
  }
  spawnState.pendingCount = firstRequestIndex;
  spawnState.nextRequestId -= removedCount;
}

function recordGeneratedEdgeCoverage(
  engine: GameEngine,
  spawnState: SpawnManagerState,
  firstRequestIndex: number,
): void {
  const coversLeft = isMeaningfulEdgePressureFormation(
    engine,
    spawnState,
    firstRequestIndex,
    -1,
  );
  const coversRight = isMeaningfulEdgePressureFormation(
    engine,
    spawnState,
    firstRequestIndex,
    1,
  );

  spawnState.leftEdgeOpenGroups = coversLeft
    ? 0
    : incrementEdgeOpenGroupCounter(spawnState.leftEdgeOpenGroups);
  spawnState.rightEdgeOpenGroups = coversRight
    ? 0
    : incrementEdgeOpenGroupCounter(spawnState.rightEdgeOpenGroups);
}

function resolvePatternDepth(pattern: SpawnPattern): number {
  const obstacles = pattern.obstacles;
  let depth = 0;
  for (let index = 0; index < obstacles.length; index += 1) {
    const forwardOffset = obstacles[index].forwardOffset;
    if (forwardOffset > depth) {
      depth = forwardOffset;
    }
  }
  return depth;
}

function hasRequestCapacityForPattern(spawnState: SpawnManagerState, pattern: SpawnPattern): boolean {
  const freeSlots = spawnState.requests.length - spawnState.pendingCount;
  return freeSlots >= pattern.obstacles.length;
}

function ensurePopulationCursorInitialized(engine: GameEngine, spawnState: SpawnManagerState): void {
  if (spawnState.populationCursorInitialized) {
    return;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  spawnState.nextPatternOriginY = scrollOffsetY + GAME_CONFIG.SPAWN_LOOKAHEAD_DISTANCE;
  spawnState.populationCursorInitialized = true;
}

function resolveNonOverlappingOriginY(
  spawnState: SpawnManagerState,
  patternDepth: number,
): number {
  let originY = spawnState.nextPatternOriginY;
  if (!spawnState.populationLastPatternPlaced) {
    return originY;
  }

  const minOriginY =
    spawnState.lastPatternOriginY + patternDepth + GAME_CONFIG.PATTERN_READABILITY_GAP;
  if (originY < minOriginY) {
    originY = minOriginY;
  }
  return originY;
}

function appendSequentialPopulationPattern(
  engine: GameEngine,
  spawnState: SpawnManagerState,
): number {
  const laneCount = spawnState.laneCount;
  if (laneCount <= 0) {
    return 0;
  }

  const serial = spawnState.populationPatternSerial;
  spawnState.populationPatternSerial = serial + 1;
  const isSafePatternSlot = serial % SAFE_PATTERN_EVERY === SAFE_PATTERN_EVERY - 1;
  const edgePressureTarget = resolveEdgePressureTarget(
    spawnState,
    engine.difficultyRef.current.currentLevel,
  );
  const needsEdgePressure = edgePressureTarget !== 0;
  const selectionAttempts = isSafePatternSlot ? 1 : MAX_PATTERN_SELECTION_ATTEMPTS;

  let lastFailedStartOriginY = resolveNonOverlappingOriginY(spawnState, 0);
  let lastFailedDepth = 0;

  for (let attempt = 0; attempt < selectionAttempts; attempt += 1) {
    let pattern: SpawnPattern;
    if (needsEdgePressure) {
      pattern = resolveEdgePressurePattern(
        edgePressureTarget as Exclude<EdgePressureTarget, 0>,
        engine.difficultyRef.current.currentLevel,
      );
    } else if (isSafePatternSlot) {
      pattern = SINGLE_ROCK_PATTERN;
    } else {
      const forcedPattern = pickForcedCabinPatternIfPending(isSafePatternSlot, SPAWN_PATTERN_LIBRARY);
      pattern = forcedPattern ?? pickWeightedSpawnPattern(spawnState);
    }
    const centerLane =
      edgePressureTarget < 0
        ? 0
        : edgePressureTarget > 0
          ? laneCount - 1
          : pickPatternCenterLaneIndex(spawnState, laneCount);

    const isCabinPattern = patternContainsCabin(pattern);
    if (isCabinPattern) {
      logCabinPatternSelected(pattern.id, attempt + 1);
    }

    if (!hasRequestCapacityForPattern(spawnState, pattern)) {
      continue;
    }

    const depth = resolvePatternDepth(pattern);
    const startOriginY = resolveNonOverlappingOriginY(spawnState, depth);
    lastFailedStartOriginY = startOriginY;
    lastFailedDepth = depth;

    const spawnLayout = {
      laneCount: spawnState.laneCount,
      laneWidth: spawnState.laneWidth,
      playableOriginX: spawnState.playableOriginX,
    };

    const originY = findClearPatternOriginY(
      pattern,
      startOriginY,
      centerLane,
      spawnLayout,
      engine.obstacleRef.current,
      engine.coinRef.current,
      engine.shieldRef.current,
      engine.speedBoostRef.current,
      spawnState.requests,
      spawnState.pendingCount,
    );

    if (isCabinPattern) {
      const footprintAtStart = calculatePatternFootprint(
        pattern,
        startOriginY,
        centerLane,
        spawnLayout.laneCount,
        spawnLayout.laneWidth,
        spawnLayout.playableOriginX,
      );
      if (Number.isNaN(originY)) {
        const occupiedAtStart = isSpawnAreaOccupied(
          footprintAtStart,
          engine.obstacleRef.current,
          spawnState.requests,
          spawnState.pendingCount,
        );
        logCabinValidationFailed(
          startOriginY,
          footprintAtStart,
          occupiedAtStart
            ? 'no clear origin within validation Y retries (occupied at startOriginY)'
            : 'no clear origin within validation Y retries (not occupied at startOriginY)',
        );
      } else {
        const footprintAtOrigin = calculatePatternFootprint(
          pattern,
          originY,
          centerLane,
          spawnLayout.laneCount,
          spawnLayout.laneWidth,
          spawnLayout.playableOriginX,
        );
        logCabinValidationPassed(originY, footprintAtOrigin);
      }
    }

    if (Number.isNaN(originY)) {
      continue;
    }

    if (isCabinPattern) {
      logCabinEnqueued();
    }

    const firstRequestIndex = spawnState.pendingCount;
    const written = enqueueSpawnPatternRequests(
      spawnState,
      pattern,
      originY,
      centerLane,
      engine.obstacleRef.current,
    );
    if (written <= 0) {
      continue;
    }
    if (
      needsEdgePressure &&
      !isMeaningfulEdgePressureFormation(
        engine,
        spawnState,
        firstRequestIndex,
        edgePressureTarget as Exclude<EdgePressureTarget, 0>,
      )
    ) {
      rollbackGeneratedRequests(spawnState, firstRequestIndex);
      continue;
    }

    spawnState.populationLastPatternPlaced = true;
    spawnState.lastPatternOriginY = originY;
    recordGeneratedEdgeCoverage(engine, spawnState, firstRequestIndex);
    if (needsEdgePressure) {
      spawnState.lastEdgePressureSide = edgePressureTarget as Exclude<EdgePressureTarget, 0>;
      spawnState.edgePressureCooldownRemaining = GAME_CONFIG.EDGE_PRESSURE_MIN_COOLDOWN_GROUPS;
    } else if (spawnState.edgePressureCooldownRemaining > 0) {
      spawnState.edgePressureCooldownRemaining -= 1;
    }

    const gap = randomIntInclusive(
      spawnState,
      GAME_CONFIG.PATTERN_VERTICAL_SPACING_MIN,
      GAME_CONFIG.PATTERN_VERTICAL_SPACING_MAX,
    );
    spawnState.nextPatternOriginY = originY + depth + gap;

    return written;
  }

  spawnState.nextPatternOriginY =
    lastFailedStartOriginY + lastFailedDepth + GAME_CONFIG.PATTERN_VERTICAL_SPACING_MIN;
  return 0;
}

export function resetSpawnPopulationState(spawnState: SpawnManagerState): void {
  resetDebugForceCabinState();
  spawnState.populationPatternSerial = 0;
  spawnState.nextPatternOriginY = 0;
  spawnState.populationCursorInitialized = false;
  spawnState.populationLastPatternPlaced = false;
  spawnState.lastPatternOriginY = 0;
  spawnState.leftEdgeOpenGroups = 0;
  spawnState.rightEdgeOpenGroups = 0;
  spawnState.edgePressureCooldownRemaining = 0;
  spawnState.lastEdgePressureSide = 0;
}

export function maintainSpawnPopulationAhead(engine: GameEngine, spawnState: SpawnManagerState): void {
  if (spawnState.laneCount <= 0 || spawnState.laneWidth <= 0) {
    return;
  }

  ensurePopulationCursorInitialized(engine, spawnState);

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const lookaheadFrontierY = scrollOffsetY + GAME_CONFIG.POPULATION_LOOKAHEAD;
  const maxPatternsPerStep = GAME_CONFIG.MAX_PATTERNS_PER_FIXED_STEP;

  let patternsPlaced = 0;
  while (
    spawnState.nextPatternOriginY < lookaheadFrontierY &&
    patternsPlaced < maxPatternsPerStep &&
    spawnState.pendingCount < spawnState.requests.length
  ) {
    const written = appendSequentialPopulationPattern(engine, spawnState);
    if (written <= 0) {
      break;
    }
    patternsPlaced += 1;
  }
}
