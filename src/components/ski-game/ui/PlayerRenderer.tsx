import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { PlayerSnapshot } from '../entities/Player';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG, perfFeatureEnabled } from '../utils/GameConfig';
import {
  PLAYER_ATLAS,
  PLAYER_ATLAS_TEXTURE,
  PLAYER_SPRITE_FRAME_COUNT,
  PLAYER_SPRITE_SOURCE_WIDTH,
} from '../utils/player-sprite';

const PLAYER_DAMAGE_BLINK_VISIBLE_MS = 60;
const PLAYER_DAMAGE_BLINK_PERIOD_MS = 120;
const PLAYER_DAMAGE_BLINK_DIM_OPACITY = 0.35;

const PLAYER_FRAME_MS = 1000 / GAME_CONFIG.PLAYER_SPRITE_ANIMATION_FPS;
const DEBUG_PLAYER_HITBOX = GAME_CONFIG.DEBUG_PLAYER_HITBOX;

const VISUAL_WIDTH = GAME_CONFIG.PLAYER_VISUAL_WIDTH;
const VISUAL_HEIGHT = GAME_CONFIG.PLAYER_VISUAL_HEIGHT;
const VISUAL_OFFSET_X = GAME_CONFIG.PLAYER_VISUAL_OFFSET_X;
const VISUAL_OFFSET_Y = GAME_CONFIG.PLAYER_VISUAL_OFFSET_Y;

const AnimatedImage = Animated.createAnimatedComponent(Image);

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

const playerStyles = StyleSheet.create({
  clip: {
    position: 'absolute',
    overflow: 'hidden',
    width: VISUAL_WIDTH,
    height: VISUAL_HEIGHT,
  },
  atlasImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  debugHitbox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.9)',
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
  },
});

type PlayerRendererProps = {
  player: PlayerSnapshot;
};

export const PlayerRenderer = memo(function PlayerRenderer({ player }: PlayerRendererProps) {
  const engine = useGameEngineContext();
  const playerX = useSharedValue(player.x);
  const leanAngle = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);
  const animFrameIndex = useSharedValue(0);

  const visualLeftOffset =
    player.width * 0.5 - VISUAL_WIDTH * 0.5 + VISUAL_OFFSET_X;
  const visualTop =
    player.y + player.height * 0.5 - VISUAL_HEIGHT * 0.5 + VISUAL_OFFSET_Y;

  const staticClipStyle = useMemo(
    () => ({
      top: visualTop,
    }),
    [visualTop],
  );

  const debugHitboxStyle = useMemo(
    () =>
      DEBUG_PLAYER_HITBOX
        ? {
            top: player.y,
            width: player.width,
            height: player.height,
          }
        : null,
    [player.height, player.width, player.y],
  );

  useEffect(() => {
    const livePlayer = engine.playerRef.current;
    if (livePlayer) {
      playerX.value = livePlayer.x;
      bodyOpacity.value = resolveInvulnerabilityBlinkOpacity(
        engine.healthRef.current.isInvulnerable,
        engine.healthRef.current.invulnerabilityRemainingMs,
      );
    }
    leanAngle.value = engine.playerFeelRef.current.leanAngle;
    if (perfFeatureEnabled('ANIMATION')) {
      animFrameIndex.value =
        Math.floor(engine.timeRef.current.elapsedMs / PLAYER_FRAME_MS) % PLAYER_SPRITE_FRAME_COUNT;
    }

    return engine.onPlayingFrame(() => {
      const currentPlayer = engine.playerRef.current;
      if (!currentPlayer) {
        bodyOpacity.value = 0;
        return;
      }

      playerX.value = currentPlayer.x;
      leanAngle.value = engine.playerFeelRef.current.leanAngle;

      // elapsedMs only advances during `playing` fixed steps — pause / game over freeze the frame.
      if (perfFeatureEnabled('ANIMATION')) {
        animFrameIndex.value =
          Math.floor(engine.timeRef.current.elapsedMs / PLAYER_FRAME_MS) % PLAYER_SPRITE_FRAME_COUNT;
      }

      const health = engine.healthRef.current;
      bodyOpacity.value = resolveInvulnerabilityBlinkOpacity(
        health.isInvulnerable,
        health.invulnerabilityRemainingMs,
      );
    });
  }, [animFrameIndex, bodyOpacity, engine, leanAngle, playerX]);

  const animatedClipStyle = useAnimatedStyle(() => ({
    left: playerX.value + visualLeftOffset,
    opacity: bodyOpacity.value,
    transform: [{ rotate: `${leanAngle.value}deg` }],
  }));

  const animatedAtlasStyle = useAnimatedStyle(() => {
    const rawIndex = animFrameIndex.value;
    const frameIndex =
      ((rawIndex % PLAYER_SPRITE_FRAME_COUNT) + PLAYER_SPRITE_FRAME_COUNT) %
      PLAYER_SPRITE_FRAME_COUNT;
    const scale = VISUAL_WIDTH / PLAYER_SPRITE_SOURCE_WIDTH;
    const atlasDisplayWidth = PLAYER_ATLAS.atlasWidth * scale;
    const atlasDisplayHeight = PLAYER_ATLAS.atlasHeight * scale;
    const cropX = PLAYER_ATLAS.frameX[frameIndex] * scale;
    const cropY = PLAYER_ATLAS.frameY[frameIndex] * scale;

    return {
      width: atlasDisplayWidth,
      height: atlasDisplayHeight,
      left: -cropX,
      top: -cropY,
    };
  });

  const animatedDebugStyle = useAnimatedStyle(() => ({
    left: playerX.value,
    opacity: bodyOpacity.value > 0 ? 1 : 0,
  }));
  const clipCompositeStyle = useMemo(
    () => [playerStyles.clip, staticClipStyle, animatedClipStyle],
    [animatedClipStyle, staticClipStyle],
  );
  const atlasCompositeStyle = useMemo(
    () => [playerStyles.atlasImage, animatedAtlasStyle],
    [animatedAtlasStyle],
  );
  const debugCompositeStyle = useMemo(
    () => [playerStyles.debugHitbox, debugHitboxStyle, animatedDebugStyle],
    [animatedDebugStyle, debugHitboxStyle],
  );

  return (
    <>
      <Animated.View
        style={clipCompositeStyle}
        pointerEvents="none"
      >
        <AnimatedImage
          source={PLAYER_ATLAS_TEXTURE}
          style={atlasCompositeStyle}
          resizeMode="stretch"
        />
      </Animated.View>
      {DEBUG_PLAYER_HITBOX && debugHitboxStyle ? (
        <Animated.View
          style={debugCompositeStyle}
          pointerEvents="none"
        />
      ) : null}
    </>
  );
});
