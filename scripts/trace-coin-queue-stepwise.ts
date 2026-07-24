/**
 * Step-wise pending queue trace when SpawnManager enqueues the second coin request.
 */
import { GameEngine } from '../src/components/ski-game/engine/GameEngine';
import { requestStartGame } from '../src/components/ski-game/entities/GameState';
import { SpawnManager, SPAWN_MANAGER_ID } from '../src/components/ski-game/managers/SpawnManager';
import { CoinSystem, COIN_SYSTEM_ID } from '../src/components/ski-game/systems/CoinSystem';
import { CameraSystem } from '../src/components/ski-game/systems/CameraSystem';
import { CollisionSystem } from '../src/components/ski-game/systems/CollisionSystem';
import { DifficultySystem } from '../src/components/ski-game/systems/DifficultySystem';
import { GameOverSystem } from '../src/components/ski-game/systems/GameOverSystem';
import { GameStateSystem, GAME_STATE_SYSTEM_ID } from '../src/components/ski-game/systems/GameStateSystem';
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
import { isGameplaySimulationActive } from '../src/components/ski-game/entities/GameState';
import { GAME_CONFIG } from '../src/components/ski-game/utils/GameConfig';

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

function snapshotQueue(engine: GameEngine): { id: number; kind: string }[] {
  const spawn = engine.spawnRef.current;
  const out: { id: number; kind: string }[] = [];
  for (let i = 0; i < spawn.pendingCount; i += 1) {
    const r = spawn.requests[i];
    out.push({ id: r.id, kind: r.kind });
  }
  return out;
}

const VIEWPORT = {
  width: GAME_CONFIG.REFERENCE_VIEWPORT_WIDTH,
  height: GAME_CONFIG.REFERENCE_VIEWPORT_HEIGHT,
};
const FIXED = GAME_CONFIG.FIXED_TIMESTEP;

const engine = new GameEngine();
const systems = createCoreSystems();
for (const system of systems) {
  engine.register(system);
}
engine.setViewport(VIEWPORT.width, VIEWPORT.height);
requestStartGame(engine);
engine.runGameStateFixedUpdate(FIXED);

const postGameStateSystems = systems.filter((s) => s.id !== GAME_STATE_SYSTEM_ID);
const spawnManager = engine.getSystem(SPAWN_MANAGER_ID)!;
const systemsAfterSpawn = postGameStateSystems.filter((s) => s.id !== SPAWN_MANAGER_ID);

let firstCoinRequestId: number | null = null;

for (let frame = 0; frame < 30000; frame += 1) {
  engine.getSystem(GAME_STATE_SYSTEM_ID)?.fixedUpdate?.(FIXED);
  if (!isGameplaySimulationActive(engine.gameStateRef.current)) {
    continue;
  }

  const queueBeforeSpawn = snapshotQueue(engine);
  spawnManager.fixedUpdate?.(FIXED);
  const queueAfterSpawn = snapshotQueue(engine);

  const newCoinIds = queueAfterSpawn
    .filter((entry) => entry.kind === 'coin')
    .map((entry) => entry.id)
    .filter((id) => !queueBeforeSpawn.some((e) => e.id === id && e.kind === 'coin'));

  if (newCoinIds.length > 0) {
    const coinId = newCoinIds[0];
    console.log('new coin in queue after spawn', { frame, coinId, queueAfterSpawn });
    if (firstCoinRequestId === null) {
      firstCoinRequestId = coinId;
      for (const system of systemsAfterSpawn) {
        system.fixedUpdate?.(FIXED);
      }
      continue;
    }

    console.log('=== SECOND COIN ENQUEUE frame', frame, 'requestId', coinId, '===');
    console.log('after SpawnManager', queueAfterSpawn);

    for (const system of systemsAfterSpawn) {
      const before = snapshotQueue(engine);
      system.fixedUpdate?.(FIXED);
      const after = snapshotQueue(engine);
      const coinStillPending = after.some((e) => e.id === coinId && e.kind === 'coin');
      const coinActive = engine.coinRef.current.coins.some(
        (c) => c.active && c.spawnRequestId === coinId,
      );
      console.log(system.id, {
        before,
        after,
        targetCoinPending: coinStillPending,
        targetCoinActive: coinActive,
      });
    }
    break;
  }

  for (const system of systemsAfterSpawn) {
    system.fixedUpdate?.(FIXED);
  }
}
