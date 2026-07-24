import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { PlayerSnapshot } from '../entities/Player';
import { useGameEngineContext } from '../engine/GameEngineContext';

const SHIELD_BUBBLE_TEXTURE = require('../../../../assets/assets/shield-bubble.png') as number;

/** Visual bubble width relative to player width (gameplay dimensions unchanged). */
const SHIELD_BUBBLE_WIDTH_TO_PLAYER_WIDTH = 1.9;
/** Source art aspect ratio: shield-bubble.png is 400×492. */
const SHIELD_BUBBLE_SOURCE_HEIGHT_TO_WIDTH = 492 / 400;
const SHIELD_BUBBLE_OPACITY = 1;
const SHIELD_PULSE_PERIOD_MS = 1000;
const SHIELD_PULSE_SCALE_MAX = 1.08;
const TWO_PI = Math.PI * 2;

const bubbleStyles = StyleSheet.create({
  positionWrapper: {
    position: 'absolute',
  },
  pulseContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
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
  const isShieldActive = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const layout = useMemo(() => {
    const bubbleWidth = player.width * SHIELD_BUBBLE_WIDTH_TO_PLAYER_WIDTH;
    const bubbleHeight = bubbleWidth * SHIELD_BUBBLE_SOURCE_HEIGHT_TO_WIDTH;
    // player.x / player.y are top-left (see createPlayerForViewport).
    const playerCenterOffsetX = player.width * 0.5;
    const playerCenterOffsetY = player.height * 0.5;
    return {
      bubbleWidth,
      bubbleHeight,
      bubbleTop: player.y + playerCenterOffsetY - bubbleHeight * 0.5,
      bubbleLeftOffset: playerCenterOffsetX - bubbleWidth * 0.5,
    };
  }, [player.height, player.width, player.y]);

  const staticPositionStyle = useMemo(
    () => ({
      top: layout.bubbleTop,
      width: layout.bubbleWidth,
      height: layout.bubbleHeight,
    }),
    [layout.bubbleHeight, layout.bubbleTop, layout.bubbleWidth],
  );

  const imageStyle = useMemo(() => bubbleStyles.image, []);

  useEffect(() => {
    const livePlayer = engine.playerRef.current;
    if (livePlayer) {
      playerX.value = livePlayer.x;
    }

    return engine.onFrame(() => {
      const currentPlayer = engine.playerRef.current;
      if (currentPlayer) {
        playerX.value = currentPlayer.x;
      }

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
  }, [engine, isShieldActive, playerX, pulseScale]);

  const animatedPositionStyle = useAnimatedStyle(() => ({
    left: playerX.value + layout.bubbleLeftOffset,
    opacity: isShieldActive.value > 0 ? SHIELD_BUBBLE_OPACITY : 0,
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[bubbleStyles.positionWrapper, staticPositionStyle, animatedPositionStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[bubbleStyles.pulseContainer, animatedPulseStyle]} pointerEvents="none">
        <Image
          source={SHIELD_BUBBLE_TEXTURE}
          style={imageStyle}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
});
