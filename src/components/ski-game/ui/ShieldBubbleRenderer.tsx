import { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { PlayerSnapshot } from '../entities/Player';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';

const SHIELD_BUBBLE_RADIUS_TO_PLAYER_WIDTH = 1.35;
const SHIELD_BUBBLE_OPACITY = 1;
const SHIELD_BUBBLE_BORDER_WIDTH = 4;
const SHIELD_GLOW_RING_INSET = 6;
const SHIELD_GLOW_RING_BORDER_WIDTH = 3;
const SHIELD_PULSE_PERIOD_MS = 1000;
const SHIELD_PULSE_SCALE_MAX = 1.08;
const TWO_PI = Math.PI * 2;

const bubbleStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderColor: SKI_GAME_COLORS.shieldBubbleGlow,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.shieldBubbleFill,
    borderColor: SKI_GAME_COLORS.shieldBubbleBorder,
  },
});

type ShieldBubbleRendererProps = {
  player: PlayerSnapshot;
};

export const ShieldBubbleRenderer = memo(function ShieldBubbleRenderer({
  player,
}: ShieldBubbleRendererProps) {
  const engine = useGameEngineContext();
  const playerX = useSharedValue(player.x);
  const leanAngle = useSharedValue(0);
  const isShieldActive = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const layout = useMemo(() => {
    const diameter = player.width * SHIELD_BUBBLE_RADIUS_TO_PLAYER_WIDTH * 2;
    const offsetX = (player.width - diameter) * 0.5;
    const offsetY = (player.height - diameter) * 0.5;
    const glowDiameter = diameter + SHIELD_GLOW_RING_INSET * 2;
    return {
      wrapperTop: player.y + offsetY - SHIELD_GLOW_RING_INSET,
      wrapperOffsetX: offsetX - SHIELD_GLOW_RING_INSET,
      diameter,
      borderRadius: diameter * 0.5,
      glowDiameter,
      glowBorderRadius: glowDiameter * 0.5,
      bubbleInset: SHIELD_GLOW_RING_INSET,
    };
  }, [player.height, player.width, player.y]);

  const staticWrapperStyle = useMemo(
    () => ({
      top: layout.wrapperTop,
      width: layout.glowDiameter,
      height: layout.glowDiameter,
    }),
    [layout.glowDiameter, layout.wrapperTop],
  );

  const staticGlowStyle = useMemo(
    () => ({
      left: 0,
      top: 0,
      width: layout.glowDiameter,
      height: layout.glowDiameter,
      borderRadius: layout.glowBorderRadius,
      borderWidth: SHIELD_GLOW_RING_BORDER_WIDTH,
    }),
    [layout.glowBorderRadius, layout.glowDiameter],
  );

  const staticBubbleStyle = useMemo(
    () => ({
      left: layout.bubbleInset,
      top: layout.bubbleInset,
      width: layout.diameter,
      height: layout.diameter,
      borderRadius: layout.borderRadius,
      borderWidth: SHIELD_BUBBLE_BORDER_WIDTH,
    }),
    [layout.borderRadius, layout.bubbleInset, layout.diameter],
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

      const shieldActive = engine.shieldRef.current.isShieldActive;
      isShieldActive.value = shieldActive ? 1 : 0;

      if (!shieldActive) {
        pulseScale.value = 1;
        return;
      }

      const elapsedMs = engine.timeRef.current.elapsedMs;
      const phase = (elapsedMs % SHIELD_PULSE_PERIOD_MS) / SHIELD_PULSE_PERIOD_MS;
      const pulseNormalized = (1 - Math.cos(TWO_PI * phase)) * 0.5;
      pulseScale.value = 1 + (SHIELD_PULSE_SCALE_MAX - 1) * pulseNormalized;
    });
  }, [engine, isShieldActive, leanAngle, playerX, pulseScale]);

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    left: playerX.value + layout.wrapperOffsetX,
    opacity: isShieldActive.value > 0 ? SHIELD_BUBBLE_OPACITY : 0,
    transform: [{ rotate: `${leanAngle.value}deg` }, { scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[bubbleStyles.wrapper, staticWrapperStyle, animatedWrapperStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[bubbleStyles.glowRing, staticGlowStyle]} pointerEvents="none" />
      <Animated.View style={[bubbleStyles.bubble, staticBubbleStyle]} pointerEvents="none" />
    </Animated.View>
  );
});
