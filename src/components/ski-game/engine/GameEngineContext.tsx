import { createContext, useContext, type ReactNode } from 'react';

import type { GameEngine } from './GameEngine';

const GameEngineContext = createContext<GameEngine | null>(null);

export function GameEngineProvider({
  engine,
  children,
}: {
  engine: GameEngine;
  children: ReactNode;
}) {
  return (
    <GameEngineContext.Provider value={engine}>{children}</GameEngineContext.Provider>
  );
}

export function useGameEngineContext(): GameEngine {
  const engine = useContext(GameEngineContext);
  if (!engine) {
    throw new Error('useGameEngineContext must be used within SkiGameRoot.');
  }
  return engine;
}
