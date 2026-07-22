/**
 * Trace spawn request 11 (shield) vs 12 (rock) — diagnostic only.
 */
import { GameEngine } from '../src/components/ski-game/engine/GameEngine';
import { requestStartGame } from '../src/components/ski-game/entities/GameState';
import { SpawnManager } from '../src/components/ski-game/managers/SpawnManager';
import { CameraSystem } from '../src/components/ski-game/systems/CameraSystem';
import { CoinSystem } from '../src/components/ski-game/systems/CoinSystem';
import { CollisionSystem } from '../src/components/ski-game/systems/CollisionSystem';
import { DecorativeTreeSystem } from '../src/components/ski-game/systems/DecorativeTreeSystem';
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
import { shieldWorldToScreenRect } from '../src/components/ski-game/entities/Shield';
import { obstacleWorldToScreenRect } from '../src/components/ski-game/utils/obstacle-render';
import { GAME_CONFIG } from '../src/components/ski-game/utils/GameConfig';

function createCoreSystems(): GameSystem[] {
  const systems: GameSystem[] = [
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
  ];
  if (GAME_CONFIG.DECORATIVE_TREES_ENABLED) {
    systems.push(new DecorativeTreeSystem());
  }
  systems.push(
    new CollisionSystem(),
    new HealthSystem(),
    new GameOverSystem(),
    new CoinSystem(),
    new ShieldSystem(),
    new SpeedBoostSystem(),
  );
  return systems;
}

const TARGET_SHIELD_ID = 11;
const TARGET_ROCK_ID = 12;
const VIEWPORT = { width: 390, height: 844 };
const FIXED = GAME_CONFIG.FIXED_TIMESTEP;

const engine = new GameEngine();
for (const system of createCoreSystems()) {
  engine.register(system);
}
engine.setViewport(VIEWPORT.width, VIEWPORT.height);
requestStartGame(engine);
engine.runGameStateFixedUpdate(FIXED);

let shieldEnqueuedFrame = -1;
let rockEnqueuedFrame = -1;
let shieldActivatedFrame = -1;
let rockActivatedFrame = -1;

for (let frame = 0; frame < 500; frame += 1) {
  const pendingBefore = engine.spawnRef.current.pendingCount;
  const requestsBefore = engine.spawnRef.current.requests
    .slice(0, pendingBefore)
    .map((r) => ({ id: r.id, kind: r.kind, x: r.worldX, y: r.worldY, lane: r.laneIndex }));

  engine.runFixedUpdate(FIXED);

  const spawn = engine.spawnRef.current;
  for (let i = 0; i < spawn.pendingCount; i += 1) {
    const r = spawn.requests[i];
    if (r.id === TARGET_SHIELD_ID && shieldEnqueuedFrame < 0) {
      shieldEnqueuedFrame = frame;
      console.log('[enqueue shield]', frame, r);
    }
    if (r.id === TARGET_ROCK_ID && rockEnqueuedFrame < 0) {
      rockEnqueuedFrame = frame;
      console.log('[enqueue rock]', frame, r);
    }
  }

  for (const s of engine.shieldRef.current.shields) {
    if (s.active && s.spawnRequestId === TARGET_SHIELD_ID && shieldActivatedFrame < 0) {
      shieldActivatedFrame = frame;
      console.log('[activate shield]', frame, s);
    }
  }
  for (const o of engine.obstacleRef.current.obstacles) {
    if (o.active && o.spawnRequestId === TARGET_ROCK_ID && rockActivatedFrame < 0) {
      rockActivatedFrame = frame;
      console.log('[activate rock]', frame, o);
    }
  }

  const scroll = engine.worldRef.current.scrollOffsetY;
  const cam = engine.cameraRef.current.offsetX;
  for (const s of engine.shieldRef.current.shields) {
    if (!s.active || s.spawnRequestId !== TARGET_SHIELD_ID) continue;
    for (const o of engine.obstacleRef.current.obstacles) {
      if (!o.active || o.spawnRequestId !== TARGET_ROCK_ID) continue;
      const sr = shieldWorldToScreenRect(s, scroll, cam);
      const or = obstacleWorldToScreenRect(o, scroll, cam);
      console.log('[overlap frame]', frame, { shieldEnqueuedFrame, rockEnqueuedFrame, shieldActivatedFrame, rockActivatedFrame });
      console.log('pending before tick:', requestsBefore);
      engine.dispose();
      process.exit(0);
    }
  }
}

engine.dispose();
process.exit(1);
