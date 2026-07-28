import assert from 'node:assert/strict';

import { GameEngine } from '../src/components/ski-game/engine/GameEngine';
import { OBSTACLE_VARIANT_DIMENSIONS } from '../src/components/ski-game/types/ObstacleTypes';
import { createInitialSpawnManagerState } from '../src/components/ski-game/types/SpawnTypes';
import { clearPendingSpawnRequests } from '../src/components/ski-game/utils/spawn-requests';
import {
  maintainSpawnPopulationAhead,
  resetSpawnPopulationState,
} from '../src/components/ski-game/utils/spawn-population';
import { GAME_CONFIG } from '../src/components/ski-game/utils/GameConfig';

const VIEWPORT_WIDTH = 390;
const GROUPS_TO_SAMPLE = 750;
const HORIZONTAL_BAND_COUNT = 5;

type EdgeTarget = 'left' | 'right';
type SimulationSummary = {
  maximumLeftOpenRun: number;
  maximumRightOpenRun: number;
  leftPressureCount: number;
  rightPressureCount: number;
};

function groupHasEscapeBand(engine: GameEngine): boolean {
  const spawn = engine.spawnRef.current;
  const playerCollisionWidth =
    GAME_CONFIG.PLAYER_WIDTH - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;
  const playerCollisionHeight =
    GAME_CONFIG.PLAYER_HEIGHT - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;
  const minimumPlayerCenter = GAME_CONFIG.PLAYER_HORIZONTAL_PADDING + GAME_CONFIG.PLAYER_WIDTH / 2;
  const maximumPlayerCenter =
    VIEWPORT_WIDTH - GAME_CONFIG.PLAYER_HORIZONTAL_PADDING - GAME_CONFIG.PLAYER_WIDTH / 2;

  for (let sampleIndex = 0; sampleIndex < spawn.pendingCount; sampleIndex += 1) {
    const sample = spawn.requests[sampleIndex];
    if (!sample.active || sample.kind !== 'obstacle') {
      continue;
    }

    let hasClearBand = false;
    for (let band = 0; band < HORIZONTAL_BAND_COUNT; band += 1) {
      const playerCenterX =
        minimumPlayerCenter +
        ((maximumPlayerCenter - minimumPlayerCenter) * band) / (HORIZONTAL_BAND_COUNT - 1);
      let blocked = false;

      for (let obstacleIndex = 0; obstacleIndex < spawn.pendingCount; obstacleIndex += 1) {
        const obstacle = spawn.requests[obstacleIndex];
        if (!obstacle.active || obstacle.kind !== 'obstacle') {
          continue;
        }
        const dimensions =
          OBSTACLE_VARIANT_DIMENSIONS[obstacle.obstacleVariant ?? 'small_rock'];
        const verticalLimit =
          (playerCollisionHeight + dimensions.height) / 2 +
          GAME_CONFIG.OBSTACLE_VERTICAL_SAFETY_MARGIN;
        const horizontalLimit =
          (playerCollisionWidth + dimensions.width) / 2 +
          GAME_CONFIG.OBSTACLE_PASSAGE_SAFETY_MARGIN / 2;
        if (
          Math.abs(sample.worldY - obstacle.worldY) < verticalLimit &&
          Math.abs(playerCenterX - obstacle.worldX) < horizontalLimit
        ) {
          blocked = true;
          break;
        }
      }

      if (!blocked) {
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
  engine: GameEngine,
  target: EdgeTarget,
): number {
  const spawn = engine.spawnRef.current;
  const playerCollisionWidth =
    GAME_CONFIG.PLAYER_WIDTH - GAME_CONFIG.PLAYER_COLLISION_PADDING * 2;
  const edgePlayerCenter =
    target === 'left'
      ? GAME_CONFIG.PLAYER_HORIZONTAL_PADDING + GAME_CONFIG.PLAYER_WIDTH / 2
      : VIEWPORT_WIDTH -
        GAME_CONFIG.PLAYER_HORIZONTAL_PADDING -
        GAME_CONFIG.PLAYER_WIDTH / 2;
  let required = 0;

  for (let index = 0; index < spawn.pendingCount; index += 1) {
    const request = spawn.requests[index];
    if (!request.active || request.kind !== 'obstacle') {
      continue;
    }
    const dimensions =
      OBSTACLE_VARIANT_DIMENSIONS[request.obstacleVariant ?? 'small_rock'];
    const horizontalLimit =
      (playerCollisionWidth + dimensions.width) / 2 +
      GAME_CONFIG.OBSTACLE_PASSAGE_SAFETY_MARGIN / 2;
    if (Math.abs(edgePlayerCenter - request.worldX) >= horizontalLimit) {
      continue;
    }
    const displacement =
      target === 'left'
        ? request.worldX + horizontalLimit - edgePlayerCenter
        : edgePlayerCenter - (request.worldX - horizontalLimit);
    required = Math.max(required, displacement);
  }

  return required;
}

function formationMeaningfullyPressures(engine: GameEngine, target: EdgeTarget): boolean {
  return (
    engine.spawnRef.current.pendingCount >= 2 &&
    resolveRequiredInwardDisplacement(engine, target) >=
      GAME_CONFIG.EDGE_PRESSURE_MIN_INWARD_CLEARANCE &&
    groupHasEscapeBand(engine)
  );
}

function configureLaneLayout(engine: GameEngine): void {
  const spawn = engine.spawnRef.current;
  const playableWidth = VIEWPORT_WIDTH - GAME_CONFIG.PLAYABLE_WORLD_PADDING * 2;
  const minimumLaneWidth =
    playableWidth * GAME_CONFIG.OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO;
  spawn.laneCount = Math.max(3, Math.min(8, Math.floor(playableWidth / minimumLaneWidth)));
  spawn.laneWidth = playableWidth / spawn.laneCount;
  spawn.playableOriginX = GAME_CONFIG.PLAYABLE_WORLD_PADDING;
}

function verifyOuterLanesThreatenReachablePlayerEdges(): void {
  const engine = new GameEngine();
  engine.spawnRef.current = createInitialSpawnManagerState();
  configureLaneLayout(engine);

  const spawn = engine.spawnRef.current;
  const obstacleHalfWidth = OBSTACLE_VARIANT_DIMENSIONS.small_rock.width / 2;
  const leftObstacleCenter = spawn.playableOriginX + spawn.laneWidth / 2;
  const rightObstacleCenter =
    spawn.playableOriginX + spawn.laneWidth * (spawn.laneCount - 0.5);
  const leftPlayerCollisionLeft =
    GAME_CONFIG.PLAYER_HORIZONTAL_PADDING + GAME_CONFIG.PLAYER_COLLISION_PADDING;
  const leftPlayerCollisionRight =
    GAME_CONFIG.PLAYER_HORIZONTAL_PADDING +
    GAME_CONFIG.PLAYER_WIDTH -
    GAME_CONFIG.PLAYER_COLLISION_PADDING;
  const rightPlayerX =
    VIEWPORT_WIDTH - GAME_CONFIG.PLAYER_HORIZONTAL_PADDING - GAME_CONFIG.PLAYER_WIDTH;
  const rightPlayerCollisionLeft = rightPlayerX + GAME_CONFIG.PLAYER_COLLISION_PADDING;
  const rightPlayerCollisionRight =
    rightPlayerX + GAME_CONFIG.PLAYER_WIDTH - GAME_CONFIG.PLAYER_COLLISION_PADDING;

  assert.ok(
    leftObstacleCenter + obstacleHalfWidth > leftPlayerCollisionLeft &&
      leftObstacleCenter - obstacleHalfWidth < leftPlayerCollisionRight,
    'left outer lane must overlap the extreme-left player collision footprint',
  );
  assert.ok(
    rightObstacleCenter + obstacleHalfWidth > rightPlayerCollisionLeft &&
      rightObstacleCenter - obstacleHalfWidth < rightPlayerCollisionRight,
    'right outer lane must overlap the extreme-right player collision footprint',
  );
}

function resolveExpectedPressureComplexity(currentLevel: number): { min: number; max: number } {
  if (currentLevel >= 8) {
    return { min: 2, max: 3 };
  }
  return { min: 2, max: 2 };
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

/** Open-run ceiling includes pressure cooldown groups that can defer a due edge. */
function resolveMaximumOpenRun(currentLevel: number): number {
  return (
    resolveEdgeOpenGroupLimit(currentLevel) +
    GAME_CONFIG.EDGE_PRESSURE_MIN_COOLDOWN_GROUPS +
    1
  );
}

function formationIsVerticallyStaggered(engine: GameEngine): boolean {
  const spawn = engine.spawnRef.current;
  for (let left = 0; left < spawn.pendingCount; left += 1) {
    for (let right = left + 1; right < spawn.pendingCount; right += 1) {
      if (spawn.requests[left].worldY === spawn.requests[right].worldY) {
        return false;
      }
    }
  }
  return true;
}

function simulateGroups(currentLevel: number): SimulationSummary {
  const engine = new GameEngine();
  engine.setViewport(VIEWPORT_WIDTH, GAME_CONFIG.REFERENCE_VIEWPORT_HEIGHT);
  engine.spawnRef.current = createInitialSpawnManagerState();
  configureLaneLayout(engine);

  const spawn = engine.spawnRef.current;
  resetSpawnPopulationState(spawn);
  engine.difficultyRef.current.currentLevel = currentLevel;
  spawn.populationCursorInitialized = true;
  spawn.nextPatternOriginY = 0;

  let currentLeft = 0;
  let currentRight = 0;
  let maximumLeft = 0;
  let maximumRight = 0;
  let leftPressureCount = 0;
  let rightPressureCount = 0;

  for (let group = 0; group < GROUPS_TO_SAMPLE; group += 1) {
    const leftPressureDue =
      spawn.leftEdgeOpenGroups >= resolveEdgeOpenGroupLimit(currentLevel) &&
      (spawn.edgePressureCooldownRemaining === 0 ||
        spawn.leftEdgeOpenGroups >=
          resolveEdgeOpenGroupLimit(currentLevel) +
            GAME_CONFIG.EDGE_PRESSURE_MIN_COOLDOWN_GROUPS);
    const rightPressureDue =
      spawn.rightEdgeOpenGroups >= resolveEdgeOpenGroupLimit(currentLevel) &&
      (spawn.edgePressureCooldownRemaining === 0 ||
        spawn.rightEdgeOpenGroups >=
          resolveEdgeOpenGroupLimit(currentLevel) +
            GAME_CONFIG.EDGE_PRESSURE_MIN_COOLDOWN_GROUPS);
    engine.worldRef.current.scrollOffsetY =
      spawn.nextPatternOriginY - GAME_CONFIG.POPULATION_LOOKAHEAD + 1;
    maintainSpawnPopulationAhead(engine, spawn);
    assert.ok(groupHasEscapeBand(engine), `group ${group} blocked all five horizontal bands`);

    const meaningfulLeftPressure = formationMeaningfullyPressures(engine, 'left');
    const meaningfulRightPressure = formationMeaningfullyPressures(engine, 'right');
    let pressureTarget: EdgeTarget | null = null;
    if (leftPressureDue && meaningfulLeftPressure) {
      pressureTarget = 'left';
    } else if (rightPressureDue && meaningfulRightPressure) {
      pressureTarget = 'right';
    }
    if (pressureTarget !== null) {
      const expectedComplexity = resolveExpectedPressureComplexity(currentLevel);
      assert.ok(
        spawn.pendingCount >= expectedComplexity.min &&
          spawn.pendingCount <= expectedComplexity.max,
        `level ${currentLevel} ${pressureTarget} pressure used ${spawn.pendingCount} obstacles`,
      );
      assert.ok(
        formationIsVerticallyStaggered(engine),
        `level ${currentLevel} ${pressureTarget} pressure formed a horizontal wall`,
      );
      const inwardDisplacement = resolveRequiredInwardDisplacement(engine, pressureTarget);
      assert.ok(
        inwardDisplacement >= GAME_CONFIG.EDGE_PRESSURE_MIN_INWARD_CLEARANCE,
        `${pressureTarget} pressure required only ${inwardDisplacement.toFixed(1)} px inward`,
      );
      if (pressureTarget === 'left') {
        leftPressureCount += 1;
      } else {
        rightPressureCount += 1;
      }
    }

    currentLeft = meaningfulLeftPressure ? 0 : currentLeft + 1;
    currentRight = meaningfulRightPressure ? 0 : currentRight + 1;
    maximumLeft = Math.max(maximumLeft, currentLeft);
    maximumRight = Math.max(maximumRight, currentRight);
    clearPendingSpawnRequests(spawn);
  }

  return {
    maximumLeftOpenRun: maximumLeft,
    maximumRightOpenRun: maximumRight,
    leftPressureCount,
    rightPressureCount,
  };
}

verifyOuterLanesThreatenReachablePlayerEdges();
const summaries: Record<string, SimulationSummary> = {};
for (const currentLevel of [1, 5, 10]) {
  const firstRun = simulateGroups(currentLevel);
  const secondRun = simulateGroups(currentLevel);
  assert.deepEqual(
    secondRun,
    firstRun,
    `level ${currentLevel} must be deterministic for the same seed/config`,
  );
  const maximumOpenRun = resolveMaximumOpenRun(currentLevel);
  assert.ok(
    firstRun.maximumLeftOpenRun <= maximumOpenRun,
    `level ${currentLevel} left edge stayed open for ${firstRun.maximumLeftOpenRun} groups`,
  );
  assert.ok(
    firstRun.maximumRightOpenRun <= maximumOpenRun,
    `level ${currentLevel} right edge stayed open for ${firstRun.maximumRightOpenRun} groups`,
  );
  assert.ok(firstRun.leftPressureCount > 0, `level ${currentLevel} needs left pressure`);
  assert.ok(firstRun.rightPressureCount > 0, `level ${currentLevel} needs right pressure`);
  assert.ok(
    firstRun.leftPressureCount + firstRun.rightPressureCount < GROUPS_TO_SAMPLE * 0.6,
    `level ${currentLevel} pressure became repetitive`,
  );
  summaries[`level${currentLevel}`] = firstRun;
}

const resetState = createInitialSpawnManagerState();
resetState.leftEdgeOpenGroups = 3;
resetState.rightEdgeOpenGroups = 2;
resetState.edgePressureCooldownRemaining = 2;
resetState.lastEdgePressureSide = -1;
resetSpawnPopulationState(resetState);
assert.equal(resetState.leftEdgeOpenGroups, 0);
assert.equal(resetState.rightEdgeOpenGroups, 0);
assert.equal(resetState.edgePressureCooldownRemaining, 0);
assert.equal(resetState.lastEdgePressureSide, 0);

console.log('edge safe-lane regression passed', summaries);
