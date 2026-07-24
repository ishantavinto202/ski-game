import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { shieldWorldToScreenRect } from '../entities/Shield';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SHIELD_WORLD_SIZE } from '../types/ShieldTypes';
import { GAME_CONFIG } from '../utils/GameConfig';
import { getShieldRenderMargin, isShieldRectVisible } from '../utils/shield-render';

import shieldAtlasMetadata from '../../../../assets/assets/Shield Animations/shield-sprite.json';

const SHIELD_ATLAS_TEXTURE = require('../../../../assets/assets/Shield Animations/shield-sprite.png') as number;

/** ~12–15 FPS sprite loop; independent of the 60 FPS game loop. */
const SHIELD_ANIMATION_FPS = 12;
const SHIELD_FRAME_MS = 1000 / SHIELD_ANIMATION_FPS;

type TexturePackerFrameEntry = {
  frame: { x: number; y: number; w: number; h: number };
  pivot: { x: number; y: number };
};

type TexturePackerAtlas = {
  frames: Record<string, TexturePackerFrameEntry>;
  meta: { size: { w: number; h: number } };
};

const shieldAtlas = shieldAtlasMetadata as TexturePackerAtlas;

function buildShieldAtlasFrameTables(): {
  frameX: readonly number[];
  frameY: readonly number[];
  frameW: readonly number[];
  frameH: readonly number[];
  atlasWidth: number;
  atlasHeight: number;
  frameCount: number;
} {
  // Numbered frame names (1.png … 25.png) — not atlas grid order.
  const frameKeys = Object.keys(shieldAtlas.frames).sort((leftKey, rightKey) => {
    const leftNumber = Number.parseInt(leftKey, 10);
    const rightNumber = Number.parseInt(rightKey, 10);
    return leftNumber - rightNumber;
  });

  const frameX: number[] = [];
  const frameY: number[] = [];
  const frameW: number[] = [];
  const frameH: number[] = [];

  for (let index = 0; index < frameKeys.length; index += 1) {
    const entry = shieldAtlas.frames[frameKeys[index]];
    frameX.push(entry.frame.x);
    frameY.push(entry.frame.y);
    frameW.push(entry.frame.w);
    frameH.push(entry.frame.h);
  }

  return {
    frameX,
    frameY,
    frameW,
    frameH,
    atlasWidth: shieldAtlas.meta.size.w,
    atlasHeight: shieldAtlas.meta.size.h,
    frameCount: frameKeys.length,
  };
}

const SHIELD_ATLAS = buildShieldAtlasFrameTables();
const SHIELD_FRAME_COUNT = SHIELD_ATLAS.frameCount;

/** Authoritative source frame size from the atlas JSON (all frames untrimmed 179×196). */
const SHIELD_SOURCE_FRAME_WIDTH = 179;
const SHIELD_SOURCE_FRAME_HEIGHT = 196;

const AnimatedImage = Animated.createAnimatedComponent(Image);

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  clip: {
    position: 'absolute',
    overflow: 'hidden',
  },
  atlasImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

const SHIELD_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_SHIELDS; index += 1) {
  SHIELD_SLOT_INDICES.push(index);
}

type ShieldPickupRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
  animFrameIndex: SharedValue<number>;
};

const ShieldPickupRenderSlot = memo(function ShieldPickupRenderSlot({
  slotIndex,
  viewport,
  animFrameIndex,
}: ShieldPickupRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue<number>(SHIELD_WORLD_SIZE.width);
  const height = useSharedValue<number>(SHIELD_WORLD_SIZE.height);
  const opacity = useSharedValue(0);

  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  useEffect(() => {
    const margin = getShieldRenderMargin();

    return engine.onFrame(() => {
      const shield = engine.shieldRef.current.shields[slotIndex];
      if (!shield.active) {
        opacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = shieldWorldToScreenRect(shield, scrollOffsetY, cameraOffsetX);

      if (!isShieldRectVisible(rect, viewport, margin)) {
        opacity.value = 0;
        return;
      }

      left.value = rect.left;
      top.value = rect.top;
      width.value = rect.width;
      height.value = rect.height;
      opacity.value = 1;
    });
  }, [engine, height, left, opacity, slotIndex, top, viewport, width]);

  /**
   * Clip viewport = exactly one scaled source frame (179×196), contain-fit + centered
   * inside the gameplay rect. Must NOT use the full square bounds as the clip — that
   * letterbox pad previously exposed neighboring atlas columns on left/right.
   */
  const animatedClipStyle = useAnimatedStyle(() => {
    const boundsWidth = width.value;
    const boundsHeight = height.value;
    if (boundsWidth <= 0 || boundsHeight <= 0) {
      return {
        left: left.value,
        top: top.value,
        width: 0,
        height: 0,
        opacity: 0,
      };
    }

    const containScale =
      boundsWidth / SHIELD_SOURCE_FRAME_WIDTH < boundsHeight / SHIELD_SOURCE_FRAME_HEIGHT
        ? boundsWidth / SHIELD_SOURCE_FRAME_WIDTH
        : boundsHeight / SHIELD_SOURCE_FRAME_HEIGHT;

    // Integer pixel clip size so scale * source frame maps 1:1 to the viewport.
    const renderedFrameWidth = Math.max(
      1,
      Math.floor(SHIELD_SOURCE_FRAME_WIDTH * containScale),
    );
    const renderedFrameHeight = Math.max(
      1,
      Math.floor(SHIELD_SOURCE_FRAME_HEIGHT * containScale),
    );
    const padX = Math.floor((boundsWidth - renderedFrameWidth) * 0.5);
    const padY = Math.floor((boundsHeight - renderedFrameHeight) * 0.5);

    return {
      left: left.value + padX,
      top: top.value + padY,
      width: renderedFrameWidth,
      height: renderedFrameHeight,
      opacity: opacity.value,
    };
  });

  const animatedAtlasStyle = useAnimatedStyle(() => {
    const boundsWidth = width.value;
    const boundsHeight = height.value;
    if (boundsWidth <= 0 || boundsHeight <= 0) {
      return {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    }

    const containScale =
      boundsWidth / SHIELD_SOURCE_FRAME_WIDTH < boundsHeight / SHIELD_SOURCE_FRAME_HEIGHT
        ? boundsWidth / SHIELD_SOURCE_FRAME_WIDTH
        : boundsHeight / SHIELD_SOURCE_FRAME_HEIGHT;

    const renderedFrameWidth = Math.max(
      1,
      Math.floor(SHIELD_SOURCE_FRAME_WIDTH * containScale),
    );
    const renderedFrameHeight = Math.max(
      1,
      Math.floor(SHIELD_SOURCE_FRAME_HEIGHT * containScale),
    );

    // Scale from original frame size so one frame fills the clip exactly.
    const scaleX = renderedFrameWidth / SHIELD_SOURCE_FRAME_WIDTH;
    const scaleY = renderedFrameHeight / SHIELD_SOURCE_FRAME_HEIGHT;

    const rawIndex = animFrameIndex.value;
    const frameIndex =
      ((rawIndex % SHIELD_FRAME_COUNT) + SHIELD_FRAME_COUNT) % SHIELD_FRAME_COUNT;
    const frameX = SHIELD_ATLAS.frameX[frameIndex];
    const frameY = SHIELD_ATLAS.frameY[frameIndex];

    return {
      width: SHIELD_ATLAS.atlasWidth * scaleX,
      height: SHIELD_ATLAS.atlasHeight * scaleY,
      left: -(frameX * scaleX),
      top: -(frameY * scaleY),
    };
  });

  return (
    <Animated.View style={[clipStyle, animatedClipStyle]} pointerEvents="none">
      <AnimatedImage
        source={SHIELD_ATLAS_TEXTURE}
        style={[atlasImageStyle, animatedAtlasStyle]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type ShieldPickupRendererProps = {
  viewport: ViewportSize;
};

export const ShieldPickupRenderer = memo(function ShieldPickupRenderer({
  viewport,
}: ShieldPickupRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);

  useEffect(() => {
    return engine.onFrame(() => {
      const elapsedMs = engine.timeRef.current.elapsedMs;
      animFrameIndex.value = Math.floor(elapsedMs / SHIELD_FRAME_MS) % SHIELD_FRAME_COUNT;
    });
  }, [animFrameIndex, engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SHIELD_SLOT_INDICES.map((slotIndex) => (
        <ShieldPickupRenderSlot
          key={slotIndex}
          slotIndex={slotIndex}
          viewport={viewport}
          animFrameIndex={animFrameIndex}
        />
      ))}
    </View>
  );
});
