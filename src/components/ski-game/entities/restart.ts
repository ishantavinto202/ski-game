import { createPlayerForViewport } from './Player';
import type { GameEngine } from '../engine/GameEngine';
import { createInitialInputState } from '../types/InputTypes';
import { resetHealthState } from '../types/HealthTypes';
import { resetScoreState } from '../types/score-state';
import { resetCollisionState } from '../types/CollisionTypes';
import { createInitialTimeState } from '../types/time-state';
import { createInitialWorldState } from '../types/world-state';
import { createInitialCameraState } from '../types/camera-state';
import { createInitialMovementState } from '../types/movement-state';
import { createInitialPlayerFeelState } from '../types/player-feel-state';
import { createInitialDifficultyState } from '../types/DifficultyTypes';
import { createInitialGameStateRefState } from '../types/GameStateTypes';
import type { CoinPoolState, CoinRecord } from '../types/CoinTypes';
import type { ObstaclePoolState, ObstacleRecord } from '../types/ObstacleTypes';
import type { ShieldPoolState, ShieldRecord } from '../types/ShieldTypes';
import type { SpeedBoostPoolState, SpeedBoostRecord } from '../types/SpeedBoostTypes';
import type { SpawnManagerState } from '../types/SpawnTypes';
import { clearPendingSpawnRequests } from '../utils/spawn-requests';
import { resetSpawnPopulationState } from '../utils/spawn-population';
import { resetCabinDebugCounters } from '../utils/cabin-debug';
import { resetCoinSchedulingDebugCounters } from '../utils/coin-scheduling-debug';
import { resetCoinActiveLifecycleDebug } from '../utils/coin-active-lifecycle-debug';
import { GAME_CONFIG } from '../utils/GameConfig';
import { resetDecorativeTreePoolInPlace } from './DecorativeTree';
import { getGameplayFeedbackPool, resetGameplayFeedbackPool } from '../effects/GameplayFeedback';
import { clearGameOverCacheState } from '../ui/GameOverTypes';

function resetGameStateRef(engine: GameEngine): void {
  const next = createInitialGameStateRefState();
  const state = engine.gameStateRef.current;
  state.currentState = next.currentState;
  state.previousState = next.previousState;
  state.pendingTransition = next.pendingTransition;
}

function resetPlayerState(engine: GameEngine): void {
  const viewport = engine.viewportRef.current;
  const player = engine.playerRef.current;
  if (!viewport || !player) {
    return;
  }

  const spawned = createPlayerForViewport(viewport.width, viewport.height);
  player.x = spawned.x;
  player.y = spawned.y;

  engine.movementRef.current.velocityX = createInitialMovementState().velocityX;
  engine.playerFeelRef.current.leanAngle = createInitialPlayerFeelState().leanAngle;

  const input = engine.inputRef.current;
  input.leftPressed = createInitialInputState().leftPressed;
  input.rightPressed = createInitialInputState().rightPressed;
}

function resetTimeState(engine: GameEngine): void {
  const next = createInitialTimeState();
  const time = engine.timeRef.current;
  time.elapsedMs = next.elapsedMs;
  time.deltaMs = next.deltaMs;
  time.totalDistance = next.totalDistance;
  time.fixedAccumulatorMs = next.fixedAccumulatorMs;
}

function resetDifficultyState(engine: GameEngine): void {
  const next = createInitialDifficultyState();
  const difficulty = engine.difficultyRef.current;
  difficulty.elapsedTimeMs = next.elapsedTimeMs;
  difficulty.currentLevel = next.currentLevel;
  difficulty.speedMultiplier = next.speedMultiplier;
  difficulty.spawnIntervalMultiplier = next.spawnIntervalMultiplier;
}

function resetWorldState(engine: GameEngine): void {
  engine.worldRef.current.scrollOffsetY = createInitialWorldState().scrollOffsetY;
}

function resetCameraState(engine: GameEngine): void {
  engine.cameraRef.current.offsetX = createInitialCameraState().offsetX;
}

function resetScoreStateRef(engine: GameEngine): void {
  resetScoreState(engine.scoreRef.current);
}

function resetHealthStateRef(engine: GameEngine): void {
  resetHealthState(engine.healthRef.current);
}

function resetCollisionStateRef(engine: GameEngine): void {
  resetCollisionState(engine.collisionRef.current);
}

function resetCoinSlotInPlace(slot: CoinRecord): void {
  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.laneIndex = 0;
}

function resetCoinPoolInPlace(pool: CoinPoolState): void {
  pool.totalCoinsCollected = 0;
  pool.activeCount = 0;
  pool.nextCoinId = 1;
  const coins = pool.coins;
  for (let index = 0; index < coins.length; index += 1) {
    resetCoinSlotInPlace(coins[index]);
  }
}

function resetObstacleSlotInPlace(slot: ObstacleRecord): void {
  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.laneIndex = 0;
  slot.width = 0;
  slot.height = 0;
  slot.variant = 'small_rock';
}

function resetObstaclePoolInPlace(pool: ObstaclePoolState): void {
  pool.activeCount = 0;
  pool.nextObstacleId = 1;
  pool.rngState = 0x9e3779b9;
  const obstacles = pool.obstacles;
  for (let index = 0; index < obstacles.length; index += 1) {
    resetObstacleSlotInPlace(obstacles[index]);
  }
}

function resetShieldSlotInPlace(slot: ShieldRecord): void {
  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.laneIndex = 0;
}

function resetShieldPoolInPlace(pool: ShieldPoolState): void {
  pool.activeCount = 0;
  pool.nextShieldId = 1;
  pool.isShieldActive = false;
  pool.remainingShieldMs = 0;
  const shields = pool.shields;
  for (let index = 0; index < shields.length; index += 1) {
    resetShieldSlotInPlace(shields[index]);
  }
}

function resetSpeedBoostSlotInPlace(slot: SpeedBoostRecord): void {
  slot.active = false;
  slot.id = 0;
  slot.spawnRequestId = 0;
  slot.worldX = 0;
  slot.worldY = 0;
  slot.laneIndex = 0;
}

function resetSpeedBoostPoolInPlace(pool: SpeedBoostPoolState): void {
  pool.activeCount = 0;
  pool.nextSpeedBoostId = 1;
  pool.isSpeedBoostActive = false;
  pool.remainingSpeedBoostMs = 0;
  pool.speedMultiplier = 1;
  const speedBoosts = pool.speedBoosts;
  for (let index = 0; index < speedBoosts.length; index += 1) {
    resetSpeedBoostSlotInPlace(speedBoosts[index]);
  }
}

function resetSpawnManagerPreservingLayout(spawn: SpawnManagerState): void {
  clearPendingSpawnRequests(spawn);
  spawn.elapsedSinceLastSpawnMs = 0;
  spawn.laneCursor = 0;
  spawn.kindCursor = 0;
  spawn.nextRequestId = 1;
  spawn.patternRngState = 0x7f4a7c15;
  resetSpawnPopulationState(spawn);
}

function resetGameplayFeedback(engine: GameEngine): void {
  resetGameplayFeedbackPool(getGameplayFeedbackPool(engine));
}

function resetGameOverCache(engine: GameEngine): void {
  clearGameOverCacheState(engine.gameOverCacheRef.current);
}

/**
 * Resets a live session in place — no engine recreation and no pool array reallocation.
 */
export function resetGame(engine: GameEngine): void {
  resetCabinDebugCounters();
  resetCoinSchedulingDebugCounters();
  resetCoinActiveLifecycleDebug();
  resetGameStateRef(engine);
  resetPlayerState(engine);
  resetTimeState(engine);
  resetDifficultyState(engine);
  resetWorldState(engine);
  resetCameraState(engine);
  resetHealthStateRef(engine);
  resetScoreStateRef(engine);
  resetCollisionStateRef(engine);
  resetCoinPoolInPlace(engine.coinRef.current);
  resetObstaclePoolInPlace(engine.obstacleRef.current);
  resetShieldPoolInPlace(engine.shieldRef.current);
  resetSpeedBoostPoolInPlace(engine.speedBoostRef.current);
  resetSpawnManagerPreservingLayout(engine.spawnRef.current);
  if (GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
    resetDecorativeTreePoolInPlace(engine.decorativeTreeRef.current);
  }
  resetGameOverCache(engine);
  resetGameplayFeedback(engine);
}
