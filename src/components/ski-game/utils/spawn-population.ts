import type { GameEngine } from '../engine/GameEngine';
import { SPAWN_PATTERN_LIBRARY } from '../managers/SpawnPatterns';
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

function pickPatternCenterLaneIndex(spawnState: SpawnManagerState, laneCount: number): number {
  const bucket = randomIntInclusive(spawnState, 0, 2);
  if (bucket === 0) {
    return Math.max(0, Math.floor(laneCount * 0.25));
  }
  if (bucket === 1) {
    return Math.max(0, Math.floor(laneCount * 0.5));
  }
  return Math.min(laneCount - 1, Math.floor(laneCount * 0.75));
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
  const selectionAttempts = isSafePatternSlot ? 1 : MAX_PATTERN_SELECTION_ATTEMPTS;

  let lastFailedStartOriginY = resolveNonOverlappingOriginY(spawnState, 0);
  let lastFailedDepth = 0;

  for (let attempt = 0; attempt < selectionAttempts; attempt += 1) {
    let pattern: SpawnPattern;
    if (isSafePatternSlot) {
      pattern = SINGLE_ROCK_PATTERN;
    } else {
      const forcedPattern = pickForcedCabinPatternIfPending(isSafePatternSlot, SPAWN_PATTERN_LIBRARY);
      pattern = forcedPattern ?? pickWeightedSpawnPattern(spawnState);
    }
    const centerLane = isSafePatternSlot
      ? Math.floor(laneCount / 2)
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

    spawnState.populationLastPatternPlaced = true;
    spawnState.lastPatternOriginY = originY;

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
