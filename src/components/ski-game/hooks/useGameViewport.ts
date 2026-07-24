import { useCallback, useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { createPlayerForViewport, type PlayerSnapshot } from '../entities/Player';
import { resetChaserPathState, resolvePlayerWorldY } from '../entities/ChaserPath';
import type { GameEngine, ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';

type GameViewportState = {
  onLayout: (event: LayoutChangeEvent) => void;
  playerSnapshot: PlayerSnapshot | null;
  viewport: ViewportSize | null;
  isSimulationReady: boolean;
};

function syncPlayerToViewport(engine: GameEngine, width: number, height: number): PlayerSnapshot | null {
  const player = engine.playerRef.current;
  if (!player) {
    return null;
  }

  const positioned = createPlayerForViewport(width, height);
  player.x = positioned.x;
  player.y = positioned.y;

  // Re-anchor chaser behind the player without resetting chase pressure / gap smoothing.
  const chaser = engine.chaserRef.current;
  const playerCenterX = player.x + player.width * 0.5;
  chaser.x = playerCenterX - GAME_CONFIG.CHASER_WIDTH * 0.5;
  chaser.y = player.y + chaser.currentGap;
  resetChaserPathState(
    chaser.path,
    resolvePlayerWorldY(engine.worldRef.current.scrollOffsetY, player.y),
    playerCenterX - GAME_CONFIG.CHASER_WIDTH * 0.5,
  );

  return player.toSnapshot();
}

export function useGameViewport(): GameViewportState {
  const engine = useGameEngineContext();
  const [playerSnapshot, setPlayerSnapshot] = useState<PlayerSnapshot | null>(() => {
    const player = engine.playerRef.current;
    return player ? player.toSnapshot() : null;
  });
  const [viewport, setViewport] = useState<ViewportSize | null>(() => engine.viewportRef.current);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width <= 0 || height <= 0) {
        return;
      }

      engine.setViewport(width, height);

      setViewport((previous) => {
        if (previous?.width === width && previous?.height === height) {
          return previous;
        }
        return { width, height };
      });

      const snapshot = syncPlayerToViewport(engine, width, height);
      if (snapshot) {
        setPlayerSnapshot(snapshot);
      }
    },
    [engine],
  );

  useEffect(() => {
    if (!viewport) {
      return;
    }

    const snapshot = syncPlayerToViewport(engine, viewport.width, viewport.height);
    if (snapshot) {
      setPlayerSnapshot(snapshot);
    }
  }, [engine, viewport]);

  const isSimulationReady = viewport !== null;

  return { onLayout, playerSnapshot, viewport, isSimulationReady };
}
