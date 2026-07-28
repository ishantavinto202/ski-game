import { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { COIN_WORLD_SIZE } from '../types/CoinTypes';
import { getCoinRenderMargin } from '../utils/coin-render';
import { GAME_CONFIG } from '../utils/GameConfig';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

import coinAtlasMetadata from '../../../../assets/assets/Coin Animations/texture.json';

const COIN_ATLAS_TEXTURE = require('../../../../assets/assets/Coin Animations/texture.png') as number;

const COIN_ANIMATION_FPS = 12;
const COIN_FRAME_MS = 1000 / COIN_ANIMATION_FPS;

type TexturePackerFrameEntry = {
  frame: { x: number; y: number; w: number; h: number };
  pivot: { x: number; y: number };
};

type TexturePackerAtlas = {
  frames: Record<string, TexturePackerFrameEntry>;
  meta: { size: { w: number; h: number } };
};

const coinAtlas = coinAtlasMetadata as TexturePackerAtlas;

function buildCoinAtlasFrameTables(): {
  frameX: readonly number[];
  frameY: readonly number[];
  frameW: readonly number[];
  frameH: readonly number[];
  atlasWidth: number;
  atlasHeight: number;
  frameCount: number;
} {
  const frameKeys = Object.keys(coinAtlas.frames).sort((leftKey, rightKey) => {
    const leftNumber = Number.parseInt(leftKey, 10);
    const rightNumber = Number.parseInt(rightKey, 10);
    return leftNumber - rightNumber;
  });

  const frameX: number[] = [];
  const frameY: number[] = [];
  const frameW: number[] = [];
  const frameH: number[] = [];

  for (let index = 0; index < frameKeys.length; index += 1) {
    const entry = coinAtlas.frames[frameKeys[index]];
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
    atlasWidth: coinAtlas.meta.size.w,
    atlasHeight: coinAtlas.meta.size.h,
    frameCount: frameKeys.length,
  };
}

const COIN_ATLAS = buildCoinAtlasFrameTables();
const COIN_FRAME_COUNT = COIN_ATLAS.frameCount;

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

const COIN_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_COINS; index += 1) {
  COIN_SLOT_INDICES.push(index);
}

type CoinRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
  animFrameIndex: SharedValue<number>;
};

const CoinRenderSlot = memo(function CoinRenderSlot({
  slotIndex,
  viewport,
  animFrameIndex,
}: CoinRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const size = useSharedValue<number>(COIN_WORLD_SIZE.width);
  const opacity = useSharedValue(0);

  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  useEffect(() => {
    const margin = getCoinRenderMargin();

    return engine.onFrame(() => {
      const coin = engine.coinRef.current.coins[slotIndex];
      if (!coin.active) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rectLeft = coin.worldX - coin.width * 0.5 - cameraOffsetX;
      const rectTop = worldYCenterToScreenY(scrollOffsetY, coin.worldY) - coin.height * 0.5;

      if (
        rectLeft + coin.width < -margin ||
        rectLeft > viewport.width + margin ||
        rectTop + coin.height < -margin ||
        rectTop > viewport.height + margin
      ) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      left.value = rectLeft;
      top.value = rectTop;
      size.value = coin.width;
      opacity.value = 1;
    });
  }, [engine, left, opacity, size, slotIndex, top, viewport]);

  const animatedClipStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    width: size.value,
    height: size.value,
    opacity: opacity.value,
  }));

  const animatedAtlasStyle = useAnimatedStyle(() => {
    const displaySize = size.value;
    if (displaySize <= 0) {
      return {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    }

    const rawIndex = animFrameIndex.value;
    const frameIndex =
      ((rawIndex % COIN_FRAME_COUNT) + COIN_FRAME_COUNT) % COIN_FRAME_COUNT;
    const sourceWidth = COIN_ATLAS.frameW[frameIndex];
    const scale = displaySize / sourceWidth;
    const atlasDisplayWidth = COIN_ATLAS.atlasWidth * scale;
    const atlasDisplayHeight = COIN_ATLAS.atlasHeight * scale;
    const cropX = COIN_ATLAS.frameX[frameIndex] * scale;
    const cropY = COIN_ATLAS.frameY[frameIndex] * scale;

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
        source={COIN_ATLAS_TEXTURE}
        style={[atlasImageStyle, animatedAtlasStyle]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type CoinRendererProps = {
  viewport: ViewportSize;
};

export const CoinRenderer = memo(function CoinRenderer({ viewport }: CoinRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);

  useEffect(() => {
    return engine.onFrame(() => {
      const elapsedMs = engine.timeRef.current.elapsedMs;
      animFrameIndex.value = Math.floor(elapsedMs / COIN_FRAME_MS) % COIN_FRAME_COUNT;
    });
  }, [animFrameIndex, engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {COIN_SLOT_INDICES.map((slotIndex) => (
        <CoinRenderSlot
          key={slotIndex}
          slotIndex={slotIndex}
          viewport={viewport}
          animFrameIndex={animFrameIndex}
        />
      ))}
    </View>
  );
});
