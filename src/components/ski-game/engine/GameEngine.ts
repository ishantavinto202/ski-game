import { createCoinPoolState } from '../entities/Coin';
import { createDecorativeTreePoolState } from '../entities/DecorativeTree';
import { createObstaclePoolState } from '../entities/Obstacle';
import type { Player } from '../entities/Player';
import { createShieldPoolState } from '../entities/Shield';
import { createSnowSurfacePoolState } from '../entities/SnowSurface';
import { createSpeedBoostPoolState } from '../entities/SpeedBoost';
import type { GameSystem } from '../types';
import { createInitialCameraState, type CameraState } from '../types/camera-state';
import { createInitialChaserState, type ChaserState } from '../types/ChaserTypes';
import type { CoinPoolState } from '../types/CoinTypes';
import { createInitialCollisionState, type CollisionState } from '../types/CollisionTypes';
import type { DecorativeTreePoolState } from '../types/DecorativeTreeTypes';
import { createInitialDifficultyState, type DifficultyState } from '../types/DifficultyTypes';
import type { EngineRef } from '../types/engine-ref';
import {
  createInitialGameStateRefState,
  GAME_STATE_SYSTEM_ID,
  type GameStateRefState,
} from '../types/GameStateTypes';
import { createInitialHealthState, type HealthState } from '../types/HealthTypes';
import { createInitialInputState, type InputActions, type InputState } from '../types/InputTypes';
import { createInitialMovementState, type MovementState } from '../types/movement-state';
import type { ObstaclePoolState } from '../types/ObstacleTypes';
import { createInitialPlayerFeelState, type PlayerFeelState } from '../types/player-feel-state';
import type { ShieldPoolState } from '../types/ShieldTypes';
import type { SnowSurfacePoolState } from '../types/SnowSurfaceTypes';
import { createInitialSpawnManagerState, type SpawnManagerState } from '../types/SpawnTypes';
import type { SpeedBoostPoolState } from '../types/SpeedBoostTypes';
import { createInitialTimeState, type TimeState } from '../types/time-state';
import { createInitialWorldState, type WorldState } from '../types/world-state';
import { createInitialGameOverCacheState, type GameOverCacheState } from '../ui/GameOverTypes';
import { createInitialScoreState, type ScoreState } from '../types/score-state';

export type ViewportSize = {
  width: number;
  height: number;
};

export class GameEngine {
  readonly viewportRef: EngineRef<ViewportSize | null> = { current: null };
  readonly gameStateRef: EngineRef<GameStateRefState> = { current: createInitialGameStateRefState() };
  readonly playerRef: EngineRef<Player | null> = { current: null };
  readonly timeRef: EngineRef<TimeState> = { current: createInitialTimeState() };
  readonly difficultyRef: EngineRef<DifficultyState> = { current: createInitialDifficultyState() };
  readonly worldRef: EngineRef<WorldState> = { current: createInitialWorldState() };
  readonly inputRef: EngineRef<InputState> = { current: createInitialInputState() };
  readonly inputActionsRef: EngineRef<InputActions | null> = { current: null };
  readonly movementRef: EngineRef<MovementState> = { current: createInitialMovementState() };
  readonly playerFeelRef: EngineRef<PlayerFeelState> = { current: createInitialPlayerFeelState() };
  readonly cameraRef: EngineRef<CameraState> = { current: createInitialCameraState() };
  readonly spawnRef: EngineRef<SpawnManagerState> = { current: createInitialSpawnManagerState() };
  readonly obstacleRef: EngineRef<ObstaclePoolState> = { current: createObstaclePoolState() };
  readonly decorativeTreeRef: EngineRef<DecorativeTreePoolState> = {
    current: createDecorativeTreePoolState(),
  };
  readonly snowSurfaceRef: EngineRef<SnowSurfacePoolState> = {
    current: createSnowSurfacePoolState(),
  };
  readonly collisionRef: EngineRef<CollisionState> = { current: createInitialCollisionState() };
  readonly healthRef: EngineRef<HealthState> = { current: createInitialHealthState() };
  readonly scoreRef: EngineRef<ScoreState> = { current: createInitialScoreState() };
  readonly coinRef: EngineRef<CoinPoolState> = { current: createCoinPoolState() };
  readonly shieldRef: EngineRef<ShieldPoolState> = { current: createShieldPoolState() };
  readonly speedBoostRef: EngineRef<SpeedBoostPoolState> = { current: createSpeedBoostPoolState() };
  readonly chaserRef: EngineRef<ChaserState> = { current: createInitialChaserState() };
  readonly gameOverCacheRef: EngineRef<GameOverCacheState> = { current: createInitialGameOverCacheState() };

  private readonly systems = new Map<string, GameSystem>();
  private readonly viewportListeners = new Set<(engine: GameEngine) => void>();
  private readonly frameListeners = new Set<(engine: GameEngine) => void>();

  onViewportChange(listener: (engine: GameEngine) => void): () => void {
    this.viewportListeners.add(listener);
    return () => {
      this.viewportListeners.delete(listener);
    };
  }

  onFrame(listener: (engine: GameEngine) => void): () => void {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  notifyFrame(): void {
    for (const listener of this.frameListeners) {
      listener(this);
    }
  }

  runGameStateFixedUpdate(fixedDeltaMs: number): void {
    const system = this.getSystem(GAME_STATE_SYSTEM_ID);
    system?.fixedUpdate?.(fixedDeltaMs);
  }

  runFixedUpdate(fixedDeltaMs: number): void {
    this.runGameStateFixedUpdate(fixedDeltaMs);

    if (this.gameStateRef.current.currentState !== 'playing') {
      return;
    }

    for (const system of this.systems.values()) {
      if (system.id === GAME_STATE_SYSTEM_ID) {
        continue;
      }
      system.fixedUpdate?.(fixedDeltaMs);
    }
  }

  setViewport(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    const previous = this.viewportRef.current;
    if (previous?.width === width && previous?.height === height) {
      return;
    }

    this.viewportRef.current = { width, height };

    for (const listener of this.viewportListeners) {
      listener(this);
    }
  }

  register(system: GameSystem): void {
    if (this.systems.has(system.id)) {
      throw new Error(`Game system "${system.id}" is already registered.`);
    }
    this.systems.set(system.id, system);
    system.mount(this);
  }

  unregister(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) {
      return;
    }
    system.unmount();
    this.systems.delete(systemId);
  }

  getSystem(systemId: string): GameSystem | undefined {
    return this.systems.get(systemId);
  }

  dispose(): void {
    for (const systemId of [...this.systems.keys()]) {
      this.unregister(systemId);
    }
  }
}
