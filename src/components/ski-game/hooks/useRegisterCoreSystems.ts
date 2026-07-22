import { useEffect, useRef } from 'react';

import type { GameEngine } from '../engine/GameEngine';
import { CameraSystem } from '../systems/CameraSystem';
import { InputSystem } from '../systems/InputSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PlayerFeelSystem } from '../systems/PlayerFeelSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CoinSystem } from '../systems/CoinSystem';
import { ShieldSystem } from '../systems/ShieldSystem';
import { SpeedBoostSystem } from '../systems/SpeedBoostSystem';
import { HealthSystem } from '../systems/HealthSystem';
import { GameOverSystem } from '../systems/GameOverSystem';
import { ObstacleSystem } from '../systems/ObstacleSystem';
import { DecorativeTreeSystem } from '../systems/DecorativeTreeSystem';
import { SpawnManager } from '../managers/SpawnManager';
import { GameStateSystem } from '../systems/GameStateSystem';
import { DifficultySystem } from '../systems/DifficultySystem';
import { TimeSystem } from '../systems/TimeSystem';
import { WorldSystem } from '../systems/WorldSystem';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

type RegisteredCoreSystems = {
  engine: GameEngine;
  systems: GameSystem[];
};

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

export function useRegisterCoreSystems(engine: GameEngine): void {
  const registeredRef = useRef<RegisteredCoreSystems | null>(null);

  if (registeredRef.current?.engine !== engine) {
    if (registeredRef.current) {
      for (const system of [...registeredRef.current.systems].reverse()) {
        registeredRef.current.engine.unregister(system.id);
      }
    }

    const systems = createCoreSystems();
    for (const system of systems) {
      engine.register(system);
    }
    registeredRef.current = { engine, systems };
  }

  useEffect(() => {
    return () => {
      if (registeredRef.current?.engine === engine) {
        for (const system of [...registeredRef.current.systems].reverse()) {
          engine.unregister(system.id);
        }
        registeredRef.current = null;
      }
    };
  }, [engine]);
}
