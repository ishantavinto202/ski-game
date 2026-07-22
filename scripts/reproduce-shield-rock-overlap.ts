/**
 * Headless reproduction: find first frame where shield pickup render AABB
 * overlaps a small_rock render AABB. Diagnostic only — no game fixes.
 */
import { GameEngine } from '../src/components/ski-game/engine/GameEngine';
import { shieldWorldToScreenRect } from '../src/components/ski-game/entities/Shield';
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
import { aabbIntersectsWithPadding } from '../src/components/ski-game/utils/collision';
import { GAME_CONFIG } from '../src/components/ski-game/utils/GameConfig';
import { obstacleWorldToScreenRect } from '../src/components/ski-game/utils/obstacle-render';
import { worldYCenterToScreenY } from '../src/components/ski-game/utils/world-coordinates';

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

type Rect = { left: number; top: number; width: number; height: number };

function renderRectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function worldFootprintsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  const aMinX = ax - aw * 0.5;
  const aMaxX = ax + aw * 0.5;
  const aMinY = ay - ah * 0.5;
  const aMaxY = ay + ah * 0.5;
  const bMinX = bx - bw * 0.5;
  const bMaxX = bx + bw * 0.5;
  const bMinY = by - bh * 0.5;
  const bMaxY = by + bh * 0.5;
  return aMinX <= bMaxX && aMaxX >= bMinX && aMinY <= bMaxY && aMaxY >= bMinY;
}

function colliderRect(render: Rect, padding: number): Rect {
  return {
    left: render.left + padding,
    top: render.top + padding,
    width: render.width - padding * 2,
    height: render.height - padding * 2,
  };
}

function formatEntity(
  label: string,
  worldX: number,
  worldY: number,
  lane: number,
  scrollOffsetY: number,
  cameraOffsetX: number,
  width: number,
  height: number,
  collisionPadding: number,
  renderRect: Rect,
): string {
  const screenX = worldX - cameraOffsetX;
  const screenY = worldYCenterToScreenY(scrollOffsetY, worldY);
  const coll = colliderRect(renderRect, collisionPadding);
  return [
    `${label}:`,
    `  worldX: ${worldX}`,
    `  worldY: ${worldY}`,
    `  lane: ${lane}`,
    `  screenX (center): ${screenX}`,
    `  screenY (center): ${screenY}`,
    `  width: ${width}`,
    `  height: ${height}`,
    `  render rect: L=${renderRect.left.toFixed(2)} T=${renderRect.top.toFixed(2)} W=${renderRect.width} H=${renderRect.height}`,
    `  collider rect (padding ${collisionPadding}): L=${coll.left.toFixed(2)} T=${coll.top.toFixed(2)} W=${coll.width.toFixed(2)} H=${coll.height.toFixed(2)}`,
  ].join('\n');
}

const VIEWPORT = {
  width: GAME_CONFIG.REFERENCE_VIEWPORT_WIDTH,
  height: GAME_CONFIG.REFERENCE_VIEWPORT_HEIGHT,
};

const MAX_FRAMES = 60 * 60 * 5; // 5 minutes sim
const FIXED = GAME_CONFIG.FIXED_TIMESTEP;

const engine = new GameEngine();
for (const system of createCoreSystems()) {
  engine.register(system);
}
engine.setViewport(VIEWPORT.width, VIEWPORT.height);
requestStartGame(engine);
engine.runGameStateFixedUpdate(FIXED);

for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
  engine.runFixedUpdate(FIXED);

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const cameraOffsetX = engine.cameraRef.current.offsetX;
  const shields = engine.shieldRef.current.shields;
  const obstacles = engine.obstacleRef.current.obstacles;

  for (let si = 0; si < shields.length; si += 1) {
    const shield = shields[si];
    if (!shield.active) {
      continue;
    }
    const shieldRender = shieldWorldToScreenRect(shield, scrollOffsetY, cameraOffsetX);

    for (let oi = 0; oi < obstacles.length; oi += 1) {
      const rock = obstacles[oi];
      if (!rock.active || rock.variant !== 'small_rock') {
        continue;
      }

      const rockRender = obstacleWorldToScreenRect(rock, scrollOffsetY, cameraOffsetX);
      if (!renderRectsOverlap(shieldRender, rockRender)) {
        continue;
      }

      const worldOverlap = worldFootprintsOverlap(
        shield.worldX,
        shield.worldY,
        shield.width,
        shield.height,
        rock.worldX,
        rock.worldY,
        rock.width,
        rock.height,
      );

      const shieldColl = colliderRect(shieldRender, GAME_CONFIG.SHIELD_COLLISION_PADDING);
      const rockColl = colliderRect(rockRender, GAME_CONFIG.OBSTACLE_COLLISION_PADDING);
      const colliderOverlap = renderRectsOverlap(shieldColl, rockColl);

      const dx = shield.worldX - rock.worldX;
      const dy = shield.worldY - rock.worldY;

      console.log('=== SHIELD / SMALL ROCK OVERLAP REPRODUCED ===');
      console.log(`frame: ${frame}`);
      console.log(`simTimeMs: ${(frame * FIXED).toFixed(0)}`);
      console.log(`scrollOffsetY: ${scrollOffsetY}`);
      console.log(`cameraOffsetX: ${cameraOffsetX}`);
      console.log('');
      console.log(
        formatEntity(
          'Shield',
          shield.worldX,
          shield.worldY,
          shield.laneIndex,
          scrollOffsetY,
          cameraOffsetX,
          shield.width,
          shield.height,
          GAME_CONFIG.SHIELD_COLLISION_PADDING,
          shieldRender,
        ),
      );
      console.log('');
      console.log(
        formatEntity(
          'Rock',
          rock.worldX,
          rock.worldY,
          rock.laneIndex,
          scrollOffsetY,
          cameraOffsetX,
          rock.width,
          rock.height,
          GAME_CONFIG.OBSTACLE_COLLISION_PADDING,
          rockRender,
        ),
      );
      console.log('');
      console.log(`dx = shield.worldX - rock.worldX = ${dx}`);
      console.log(`dy = shield.worldY - rock.worldY = ${dy}`);
      console.log(`world space AABB overlap: ${worldOverlap}`);
      console.log(`render AABB overlap: true`);
      console.log(`collider AABB overlap (with padding): ${colliderOverlap}`);
      console.log(`shield spawnRequestId: ${shield.spawnRequestId}`);
      console.log(`rock spawnRequestId: ${rock.spawnRequestId}`);

      engine.dispose();
      process.exit(0);
    }
  }

  if (engine.gameStateRef.current.currentState === 'game_over') {
    console.log('Game over before overlap found at frame', frame);
    break;
  }
}

console.log('No shield/small_rock render overlap found within frame budget.');
engine.dispose();
process.exit(1);
