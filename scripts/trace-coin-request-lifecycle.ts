/**
 * Headless coin request lifecycle trace — tracks all coin request IDs.
 */
import { GameEngine } from '../src/components/ski-game/engine/GameEngine';
import { requestStartGame } from '../src/components/ski-game/entities/GameState';
import { SpawnManager } from '../src/components/ski-game/managers/SpawnManager';
import { CameraSystem } from '../src/components/ski-game/systems/CameraSystem';
import { CoinSystem } from '../src/components/ski-game/systems/CoinSystem';
import { CollisionSystem } from '../src/components/ski-game/systems/CollisionSystem';
import { DifficultySystem } from '../src/components/ski-game/systems/DifficultySystem';
import { GameOverSystem } from '../src/components/ski-game/systems/GameOverSystem';
import { GameStateSystem } from '../src/components/ski-game/systems/GameStateSystem';
import { HealthSystem } from '../src/components/ski-game/systems/HealthSystem';
import { InputSystem } from '../src/components/ski-game/systems/InputSystem';
import { MovementSystem } from '../src/components/ski-game/systems/MovementSystem';
import { ObstacleSystem } from '../src/components/ski-game/systems/ObstacleSystem';
import { PlayerFeelSystem } from '../src/components/ski-game/systems/PlayerFeelSystem';
import { PlayerSystem } from '../src/components/ski-game/systems/PlayerSystem';
import { ShieldSystem } from '../src/components/ski-game/systems/ShieldSystem';
import { SpeedBoostSystem } from '../src/components/ski-game/systems/SpeedBoostSystem';
import { TimeSystem } from '../src/components/ski-game/systems/TimeSystem';
import { WorldSystem } from '../src/components/ski-game/systems/WorldSystem';
import type { GameSystem } from '../src/components/ski-game/types';
import { readCoinSchedulingDebugCounts, resetCoinSchedulingDebugCounters } from '../src/components/ski-game/utils/coin-scheduling-debug';
import { isGameplaySimulationActive } from '../src/components/ski-game/entities/GameState';
import { GAME_CONFIG } from '../src/components/ski-game/utils/GameConfig';
import { isSpawnRequestPastDespawn } from '../src/components/ski-game/utils/spawn-request-intake';
import { worldYCenterToScreenY } from '../src/components/ski-game/utils/world-coordinates';

function createCoreSystems(): GameSystem[] {
  return [
    new GameStateSystem(),
    new TimeSystem(),
    new DifficultySystem(),
    new WorldSystem(),
    new InputSystem(),
    new PlayerSystem(),
    new MovementSystem(),
    new PlayerFeelSystem(),
    new CameraSystem(),
    new SpawnManager(),
    new ObstacleSystem(),
    new CollisionSystem(),
    new HealthSystem(),
    new GameOverSystem(),
    new CoinSystem(),
    new ShieldSystem(),
    new SpeedBoostSystem(),
  ];
}

const VIEWPORT = {
  width: GAME_CONFIG.REFERENCE_VIEWPORT_WIDTH,
  height: GAME_CONFIG.REFERENCE_VIEWPORT_HEIGHT,
};
const FIXED = GAME_CONFIG.FIXED_TIMESTEP;
const MAX_FRAMES = 60 * 300;

type CoinRequestRecord = {
  id: number;
  enqueueFrame: number;
  worldX: number;
  worldY: number;
  lane: number;
  lastSeenPendingFrame: number | null;
  activatedFrame: number | null;
  activatedWorldY: number | null;
  outcome: 'pending' | 'activated' | 'vanished' | 'stale-at-scan';
};

const engine = new GameEngine();
for (const system of createCoreSystems()) {
  engine.register(system);
}
engine.setViewport(VIEWPORT.width, VIEWPORT.height);
resetCoinSchedulingDebugCounters();
requestStartGame(engine);
engine.runGameStateFixedUpdate(FIXED);

const knownIds = new Map<number, CoinRequestRecord>();
let lastNextId = engine.spawnRef.current.nextRequestId;

for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
  const nextIdBefore = engine.spawnRef.current.nextRequestId;
  engine.runFixedUpdate(FIXED);
  const spawn = engine.spawnRef.current;

  if (spawn.nextRequestId > nextIdBefore) {
    for (let index = 0; index < spawn.pendingCount; index += 1) {
      const request = spawn.requests[index];
      if (request.kind === 'coin' && !knownIds.has(request.id)) {
        knownIds.set(request.id, {
          id: request.id,
          enqueueFrame: frame,
          worldX: request.worldX,
          worldY: request.worldY,
          lane: request.laneIndex,
          lastSeenPendingFrame: frame,
          activatedFrame: null,
          activatedWorldY: null,
          outcome: 'pending',
        });
      }
    }
  }

  const pendingCoinIds = new Set<number>();
  for (let index = 0; index < spawn.pendingCount; index += 1) {
    const request = spawn.requests[index];
    if (request.kind !== 'coin') {
      continue;
    }
    pendingCoinIds.add(request.id);
    const record = knownIds.get(request.id);
    if (record) {
      record.lastSeenPendingFrame = frame;
    } else {
      knownIds.set(request.id, {
        id: request.id,
        enqueueFrame: frame,
        worldX: request.worldX,
        worldY: request.worldY,
        lane: request.laneIndex,
        lastSeenPendingFrame: frame,
        activatedFrame: null,
        activatedWorldY: null,
        outcome: 'pending',
      });
    }
  }

  const pool = engine.coinRef.current;
  for (let index = 0; index < pool.coins.length; index += 1) {
    const coin = pool.coins[index];
    if (!coin.active || coin.spawnRequestId <= 0) {
      continue;
    }
    const record = knownIds.get(coin.spawnRequestId);
    if (record && record.activatedFrame === null) {
      record.activatedFrame = frame;
      record.activatedWorldY = coin.worldY;
      record.outcome = 'activated';
    }
  }

  for (const record of knownIds.values()) {
    if (record.outcome === 'pending' && !pendingCoinIds.has(record.id)) {
      const stillActive = pool.coins.some(
        (coin) => coin.active && coin.spawnRequestId === record.id,
      );
      if (!stillActive && record.lastSeenPendingFrame !== null) {
        record.outcome = 'vanished';
      }
    }
  }

  lastNextId = spawn.nextRequestId;

  if (!isGameplaySimulationActive(engine.gameStateRef.current) && frame > 500) {
    break;
  }
}

const counts = readCoinSchedulingDebugCounts();
const records = [...knownIds.values()].sort((a, b) => a.id - b.id);

console.log('=== SUMMARY ===');
console.log({ frames: MAX_FRAMES, coinRequestsTracked: records.length, ...counts });
console.log({
  coinsEverActivated: engine.coinRef.current.nextCoinId - 1,
  totalCollected: engine.coinRef.current.totalCoinsCollected,
});

for (const record of records) {
  const scroll = engine.worldRef.current.scrollOffsetY;
  const staleAtEnd = isSpawnRequestPastDespawn(
    engine,
    record.worldY,
    GAME_CONFIG.COIN_DESPAWN_MARGIN,
  );
  console.log(
    JSON.stringify({
      ...record,
      enqueueScreenY: worldYCenterToScreenY(
        engine.worldRef.current.scrollOffsetY,
        record.worldY,
      ),
      staleAtEndScan: staleAtEnd,
    }),
  );
}

const second = records[1];
if (second) {
  console.log('=== SECOND COIN REQUEST ===');
  console.log(second);
}

console.log('=== PENDING COINS AT END ===');
const spawn = engine.spawnRef.current;
for (let index = 0; index < spawn.pendingCount; index += 1) {
  const request = spawn.requests[index];
  if (request.kind === 'coin') {
    console.log({
      id: request.id,
      worldY: request.worldY,
      screenY: worldYCenterToScreenY(engine.worldRef.current.scrollOffsetY, request.worldY),
      stale: isSpawnRequestPastDespawn(engine, request.worldY, GAME_CONFIG.COIN_DESPAWN_MARGIN),
    });
  }
}
