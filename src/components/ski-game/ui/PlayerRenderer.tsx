import { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { PlayerSnapshot } from '../entities/Player';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

const PLAYER_DAMAGE_BLINK_VISIBLE_MS = 60;
const PLAYER_DAMAGE_BLINK_PERIOD_MS = 120;
const PLAYER_DAMAGE_BLINK_DIM_OPACITY = 0.35;

function resolveInvulnerabilityBlinkOpacity(
  isInvulnerable: boolean,
  invulnerabilityRemainingMs: number,
): number {
  if (!isInvulnerable) {
    return 1;
  }

  const elapsedInvulnMs =
    GAME_CONFIG.PLAYER_INVULNERABILITY_MS - invulnerabilityRemainingMs;
  const phase = elapsedInvulnMs % PLAYER_DAMAGE_BLINK_PERIOD_MS;
  return phase < PLAYER_DAMAGE_BLINK_VISIBLE_MS ? 1 : PLAYER_DAMAGE_BLINK_DIM_OPACITY;
}

const placeholderStyles = StyleSheet.create({
  body: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.playerPlaceholder,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
  },
});

type PlayerRendererProps = {
  player: PlayerSnapshot;
};

export const PlayerRenderer = memo(function PlayerRenderer({ player }: PlayerRendererProps) {
  const engine = useGameEngineContext();
  const playerX = useSharedValue(player.x);
  const leanAngle = useSharedValue(0);
  const bodyOpacity = useSharedValue(1);

  const staticBodyStyle = useMemo(
    () => ({
      top: player.y,
      width: player.width,
      height: player.height,
    }),
    [player.height, player.width, player.y],
  );

  useEffect(() => {
    const livePlayer = engine.playerRef.current;
    if (livePlayer) {
      playerX.value = livePlayer.x;
    }
    leanAngle.value = engine.playerFeelRef.current.leanAngle;

    return engine.onFrame(() => {
      const currentPlayer = engine.playerRef.current;
      if (currentPlayer) {
        playerX.value = currentPlayer.x;
      }
      leanAngle.value = engine.playerFeelRef.current.leanAngle;

      const health = engine.healthRef.current;
      bodyOpacity.value = resolveInvulnerabilityBlinkOpacity(
        health.isInvulnerable,
        health.invulnerabilityRemainingMs,
      );
    });
  }, [bodyOpacity, engine, leanAngle, playerX]);

  const animatedBodyStyle = useAnimatedStyle(() => ({
    left: playerX.value,
    opacity: bodyOpacity.value,
    transform: [{ rotate: `${leanAngle.value}deg` }],
  }));

  return (
    <Animated.View
      style={[placeholderStyles.body, staticBodyStyle, animatedBodyStyle]}
      pointerEvents="none"
    />
  );
});
