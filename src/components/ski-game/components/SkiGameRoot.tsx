import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { requestStartGame } from '../entities/GameState';
import { GameEngineProvider } from '../engine/GameEngineContext';
import { useGameEngine } from '../hooks/useGameEngine';

import { SkiGameViewport } from './SkiGameViewport';

const rootStyle = StyleSheet.create({
  root: {
    flex: 1,
  },
});

type SkiGameRootProps = {
  children?: ReactNode;
};

export const SkiGameRoot = memo(function SkiGameRoot({ children }: SkiGameRootProps) {
  const engine = useGameEngine();

  useEffect(() => {
    const state = engine.gameStateRef.current;

    if (state.currentState === 'ready') {
      requestStartGame(engine);
    }
  }, [engine]);

  return (
    <GameEngineProvider engine={engine}>
      <View style={rootStyle.root}>
        <SkiGameViewport />
        {children}
      </View>
    </GameEngineProvider>
  );
});
