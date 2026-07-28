import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SPEED_BOOST_WORLD_SIZE } from '../types/SpeedBoostTypes';
import { GAME_CONFIG } from '../utils/GameConfig';
import { getSpeedBoostRenderMargin } from '../utils/speed-boost-render';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

import speedBoostAtlasMetadata from '../../../../assets/assets/Thunder Animations/speed-boost-sprite.json';

const SPEED_BOOST_ATLAS_TEXTURE =
  require('../../../../assets/assets/Thunder Animations/speed-boost-sprite.png') as number;

/** Match ShieldPickupRenderer (~12 FPS sprite loop; independent of the 60 FPS game loop). */
const SPEED_BOOST_ANIMATION_FPS = 12;
const SPEED_BOOST_FRAME_MS = 1000 / SPEED_BOOST_ANIMATION_FPS;

type TexturePackerFrameEntry = {
  frame: { x: number; y: number; w: number; h: number };
  pivot: { x: number; y: number };
};

type TexturePackerAtlas = {
  frames: Record<string, TexturePackerFrameEntry>;
  meta: { size: { w: number; h: number } };
};

const speedBoostAtlas = speedBoostAtlasMetadata as TexturePackerAtlas;

function buildSpeedBoostAtlasFrameTables(): {
  frameX: readonly number[];
  frameY: readonly number[];
  frameW: readonly number[];
  frameH: readonly number[];
  atlasWidth: number;
  atlasHeight: number;
  frameCount: number;
} {
  // Numbered frame names — not atlas grid order, not object insertion order.
  const frameKeys = Object.keys(speedBoostAtlas.frames).sort((leftKey, rightKey) => {
    const leftNumber = Number.parseInt(leftKey, 10);
    const rightNumber = Number.parseInt(rightKey, 10);
    return leftNumber - rightNumber;
  });

  const frameX: number[] = [];
  const frameY: number[] = [];
  const frameW: number[] = [];
  const frameH: number[] = [];

  for (let index = 0; index < frameKeys.length; index += 1) {
    const entry = speedBoostAtlas.frames[frameKeys[index]];
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
    atlasWidth: speedBoostAtlas.meta.size.w,
    atlasHeight: speedBoostAtlas.meta.size.h,
    frameCount: frameKeys.length,
  };
}

const SPEED_BOOST_ATLAS = buildSpeedBoostAtlasFrameTables();
const SPEED_BOOST_FRAME_COUNT = SPEED_BOOST_ATLAS.frameCount;

/** Authoritative source frame size from the atlas JSON (all frames untrimmed 174×258). */
const SPEED_BOOST_SOURCE_FRAME_WIDTH = 174;
const SPEED_BOOST_SOURCE_FRAME_HEIGHT = 258;

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

const SPEED_BOOST_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_SPEED_BOOSTS; index += 1) {
  SPEED_BOOST_SLOT_INDICES.push(index);
}

type SpeedBoostRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
  animFrameIndex: SharedValue<number>;
};

const SpeedBoostRenderSlot = memo(function SpeedBoostRenderSlot({
  slotIndex,
  viewport,
  animFrameIndex,
}: SpeedBoostRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue<number>(SPEED_BOOST_WORLD_SIZE.width);
  const height = useSharedValue<number>(SPEED_BOOST_WORLD_SIZE.height);
  const opacity = useSharedValue(0);

  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  useEffect(() => {
    const margin = getSpeedBoostRenderMargin();

    return engine.onFrame(() => {
      const speedBoost = engine.speedBoostRef.current.speedBoosts[slotIndex];
      if (!speedBoost.active) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rectLeft = speedBoost.worldX - speedBoost.width * 0.5 - cameraOffsetX;
      const rectTop =
        worldYCenterToScreenY(scrollOffsetY, speedBoost.worldY) - speedBoost.height * 0.5;

      if (
        rectLeft + speedBoost.width < -margin ||
        rectLeft > viewport.width + margin ||
        rectTop + speedBoost.height < -margin ||
        rectTop > viewport.height + margin
      ) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      left.value = rectLeft;
      top.value = rectTop;
      width.value = speedBoost.width;
      height.value = speedBoost.height;
      opacity.value = 1;
    });
  }, [engine, height, left, opacity, slotIndex, top, viewport, width]);

  /**
   * Same proven ShieldPickupRenderer strategy: clip = exact contain-fitted source frame
   * (174×258), centered inside the unchanged gameplay rect — never pad inside the clip.
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
      boundsWidth / SPEED_BOOST_SOURCE_FRAME_WIDTH <
      boundsHeight / SPEED_BOOST_SOURCE_FRAME_HEIGHT
        ? boundsWidth / SPEED_BOOST_SOURCE_FRAME_WIDTH
        : boundsHeight / SPEED_BOOST_SOURCE_FRAME_HEIGHT;

    const renderedFrameWidth = Math.max(
      1,
      Math.floor(SPEED_BOOST_SOURCE_FRAME_WIDTH * containScale),
    );
    const renderedFrameHeight = Math.max(
      1,
      Math.floor(SPEED_BOOST_SOURCE_FRAME_HEIGHT * containScale),
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
      boundsWidth / SPEED_BOOST_SOURCE_FRAME_WIDTH <
      boundsHeight / SPEED_BOOST_SOURCE_FRAME_HEIGHT
        ? boundsWidth / SPEED_BOOST_SOURCE_FRAME_WIDTH
        : boundsHeight / SPEED_BOOST_SOURCE_FRAME_HEIGHT;

    const renderedFrameWidth = Math.max(
      1,
      Math.floor(SPEED_BOOST_SOURCE_FRAME_WIDTH * containScale),
    );
    const renderedFrameHeight = Math.max(
      1,
      Math.floor(SPEED_BOOST_SOURCE_FRAME_HEIGHT * containScale),
    );

    const scaleX = renderedFrameWidth / SPEED_BOOST_SOURCE_FRAME_WIDTH;
    const scaleY = renderedFrameHeight / SPEED_BOOST_SOURCE_FRAME_HEIGHT;

    const rawIndex = animFrameIndex.value;
    const frameIndex =
      ((rawIndex % SPEED_BOOST_FRAME_COUNT) + SPEED_BOOST_FRAME_COUNT) %
      SPEED_BOOST_FRAME_COUNT;
    const frameX = SPEED_BOOST_ATLAS.frameX[frameIndex];
    const frameY = SPEED_BOOST_ATLAS.frameY[frameIndex];

    return {
      width: SPEED_BOOST_ATLAS.atlasWidth * scaleX,
      height: SPEED_BOOST_ATLAS.atlasHeight * scaleY,
      left: -(frameX * scaleX),
      top: -(frameY * scaleY),
    };
  });

  return (
    <Animated.View style={[clipStyle, animatedClipStyle]} pointerEvents="none">
      <AnimatedImage
        source={SPEED_BOOST_ATLAS_TEXTURE}
        style={[atlasImageStyle, animatedAtlasStyle]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type SpeedBoostRendererProps = {
  viewport: ViewportSize;
};

export const SpeedBoostRenderer = memo(function SpeedBoostRenderer({
  viewport,
}: SpeedBoostRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);

  useEffect(() => {
    return engine.onFrame(() => {
      const elapsedMs = engine.timeRef.current.elapsedMs;
      animFrameIndex.value =
        Math.floor(elapsedMs / SPEED_BOOST_FRAME_MS) % SPEED_BOOST_FRAME_COUNT;
    });
  }, [animFrameIndex, engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SPEED_BOOST_SLOT_INDICES.map((slotIndex) => (
        <SpeedBoostRenderSlot
          key={slotIndex}
          slotIndex={slotIndex}
          viewport={viewport}
          animFrameIndex={animFrameIndex}
        />
      ))}
    </View>
  );
});
