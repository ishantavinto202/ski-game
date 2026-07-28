import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { requestStartGame } from '../entities/GameState';
import { resetGame } from '../entities/restart';
import { GameEngineProvider } from '../engine/GameEngineContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { MainMenu, MAIN_MENU_PLACEHOLDER_QUIT } from '../ui/MainMenu';

import { SkiGameBackground } from './SkiGameBackground';
import { SkiGameViewport } from './SkiGameViewport';

const rootStyle = StyleSheet.create({
  root: {
    flex: 1,
  },
});

type SkiGameRootProps = {
  children?: ReactNode;
};

type SessionPhase = 'menu' | 'game';

export const SkiGameRoot = memo(function SkiGameRoot({ children }: SkiGameRootProps) {
  const engine = useGameEngine();
  const [phase, setPhase] = useState<SessionPhase>('menu');

  const handlePlayGame = useCallback(() => {
    setPhase('game');
  }, []);

  const handleQuitGame = useCallback(() => {
    MAIN_MENU_PLACEHOLDER_QUIT();
  }, []);

  /** Pause Quit — abandon the run, then show Main Menu (unmounts gameplay viewport). */
  const handleQuitToMenu = useCallback(() => {
    resetGame(engine);
    setPhase('menu');
  }, [engine]);

  // After gameplay systems mount to `ready`, request `ready → playing` once.
  useEffect(() => {
    if (phase !== 'game') {
      return;
    }

    const state = engine.gameStateRef.current;
    if (state.currentState === 'ready') {
      requestStartGame(engine);
    }
  }, [engine, phase]);

  if (phase === 'menu') {
    return (
      <View style={rootStyle.root}>
        <SkiGameBackground />
        <MainMenu onPlayGame={handlePlayGame} onQuitGame={handleQuitGame} />
        {children}
      </View>
    );
  }

  return (
    <GameEngineProvider engine={engine}>
      <View style={rootStyle.root}>
        <SkiGameViewport onQuitToMenu={handleQuitToMenu} />
        {children}
      </View>
    </GameEngineProvider>
  );
});
