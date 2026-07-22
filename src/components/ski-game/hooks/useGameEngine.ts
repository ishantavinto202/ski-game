import { useEffect, useMemo } from 'react';

import type { GameEngine } from '../engine/GameEngine';
import { gameManager } from '../managers/GameManager';

export function useGameEngine(): GameEngine {
  const engine = useMemo(() => gameManager.createEngine(), []);

  useEffect(() => {
    return () => {
      gameManager.destroyEngine();
    };
  }, []);

  return engine;
}
