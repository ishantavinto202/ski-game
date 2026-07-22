import { useEffect, useRef } from 'react';

import { GameLoop } from '../engine/GameLoop';
import type { GameEngine } from '../engine/GameEngine';

export function useGameLoop(engine: GameEngine, isActive: boolean): void {
  const loopRef = useRef<GameLoop | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const loop = new GameLoop(engine);
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [engine, isActive]);
}
