import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  CHASER_ATLAS_TEXTURE,
  PLAYER_ATLAS,
  PLAYER_SPRITE_FRAME_COUNT,
  PLAYER_SPRITE_SOURCE_WIDTH,
} from '../utils/player-sprite';

/**
 * Visual size matches the player skier art (same atlas geometry).
 * Gameplay footprint stays CHASER_WIDTH × CHASER_HEIGHT (trails / avoidance).
 */
const VISUAL_WIDTH = GAME_CONFIG.PLAYER_VISUAL_WIDTH;
const VISUAL_HEIGHT = GAME_CONFIG.PLAYER_VISUAL_HEIGHT;

const CHASER_FRAME_MS = 1000 / GAME_CONFIG.PLAYER_SPRITE_ANIMATION_FPS;
/** px/frame at PLAYER_MAX_SPEED (~60 FPS) — used only for cosmetic lean. */
const MAX_LEAN_DX =
  GAME_CONFIG.PLAYER_MAX_SPEED / (1000 / GAME_CONFIG.FIXED_TIMESTEP);

const AnimatedImage = Animated.createAnimatedComponent(Image);

const chaserStyles = StyleSheet.create({
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
});

/**
 * Chaser visual — purple/green recolored skier atlas.
 * Shares PLAYER_ATLAS frame geometry; independent frame index + lean from chaser X motion.
 */
export const ChaserRenderer = memo(function ChaserRenderer() {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const opacity = useSharedValue(0);
  const leanAngle = useSharedValue(0);
  const animFrameIndex = useSharedValue(0);
  const prevX = useSharedValue(Number.NaN);

  const clipStyle = useMemo(() => chaserStyles.clip, []);
  const atlasImageStyle = useMemo(() => chaserStyles.atlasImage, []);

  useEffect(() => {
    const syncChaserVisual = (): void => {
      const player = engine.playerRef.current;
      if (!player) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const live = engine.chaserRef.current;
      const visualLeft =
        live.x + GAME_CONFIG.CHASER_WIDTH * 0.5 - VISUAL_WIDTH * 0.5;
      const visualTop =
        live.y + GAME_CONFIG.CHASER_HEIGHT * 0.5 - VISUAL_HEIGHT * 0.5;

      left.value = visualLeft;
      top.value = visualTop;
      opacity.value = 1;

      // Independent ski-cycle timing (does not copy player frame).
      animFrameIndex.value =
        Math.floor(engine.timeRef.current.elapsedMs / CHASER_FRAME_MS) %
        PLAYER_SPRITE_FRAME_COUNT;

      // Cosmetic lean from chaser horizontal motion only (renderer-local).
      if (Number.isNaN(prevX.value)) {
        prevX.value = live.x;
        leanAngle.value = 0;
      } else {
        const dx = live.x - prevX.value;
        prevX.value = live.x;
        let targetLean = 0;
        if (MAX_LEAN_DX > 0) {
          targetLean =
            (dx / MAX_LEAN_DX) * GAME_CONFIG.PLAYER_MAX_LEAN_ANGLE;
          if (targetLean > GAME_CONFIG.PLAYER_MAX_LEAN_ANGLE) {
            targetLean = GAME_CONFIG.PLAYER_MAX_LEAN_ANGLE;
          } else if (targetLean < -GAME_CONFIG.PLAYER_MAX_LEAN_ANGLE) {
            targetLean = -GAME_CONFIG.PLAYER_MAX_LEAN_ANGLE;
          }
        }
        // Light smoothing so lean does not jitter with small path corrections.
        leanAngle.value = leanAngle.value + (targetLean - leanAngle.value) * 0.35;
      }
    };

    syncChaserVisual();

    return engine.onFrame(syncChaserVisual);
  }, [animFrameIndex, engine, leanAngle, left, opacity, prevX, top]);

  const animatedClipStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    opacity: opacity.value,
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

  return (
    <Animated.View style={[clipStyle, animatedClipStyle]} pointerEvents="none">
      <AnimatedImage
        source={CHASER_ATLAS_TEXTURE}
        style={[atlasImageStyle, animatedAtlasStyle]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});
