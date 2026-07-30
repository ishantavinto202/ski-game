import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { COIN_WORLD_SIZE } from '../types/CoinTypes';
import { getCoinRenderMargin } from '../utils/coin-render';
import { GAME_CONFIG } from '../utils/GameConfig';
import { writeSharedNumber } from '../utils/shared-value-write';

import coinAtlasMetadata from '../../../../assets/assets/Coin Animations/texture.json';

const COIN_ATLAS_TEXTURE = require('../../../../assets/assets/Coin Animations/texture.png') as number;

const COIN_ANIMATION_FPS = 12;
const COIN_FRAME_MS = 1000 / COIN_ANIMATION_FPS;
const MAX_COINS = GAME_CONFIG.MAX_COINS;

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
for (let index = 0; index < MAX_COINS; index += 1) {
  COIN_SLOT_INDICES.push(index);
}

type CoinSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  size: SharedValue<number>;
  opacity: SharedValue<number>;
};

function createCoinSlotShared(): CoinSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    size: makeMutable(COIN_WORLD_SIZE.width),
    opacity: makeMutable(0),
  };
}

type CoinVisualProps = {
  shared: CoinSlotShared;
  animFrameIndex: SharedValue<number>;
};

const CoinVisual = memo(function CoinVisual({
  shared,
  animFrameIndex,
}: CoinVisualProps) {
  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  const animatedClipStyle = useAnimatedStyle(() => ({
    left: shared.left.value,
    top: shared.top.value,
    width: shared.size.value,
    height: shared.size.value,
    opacity: shared.opacity.value,
  }));

  const animatedAtlasStyle = useAnimatedStyle(() => {
    const displaySize = shared.size.value;
    if (shared.opacity.value <= 0 || displaySize <= 0) {
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
  const clipCompositeStyle = useMemo(
    () => [clipStyle, animatedClipStyle],
    [animatedClipStyle, clipStyle],
  );
  const atlasCompositeStyle = useMemo(
    () => [atlasImageStyle, animatedAtlasStyle],
    [animatedAtlasStyle, atlasImageStyle],
  );

  return (
    <Animated.View style={clipCompositeStyle} pointerEvents="none">
      <AnimatedImage
        source={COIN_ATLAS_TEXTURE}
        style={atlasCompositeStyle}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type CoinRenderSlotProps = CoinVisualProps & {
  slotIndex: number;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

const CoinRenderSlot = memo(function CoinRenderSlot({
  slotIndex,
  shared,
  animFrameIndex,
  registerVisibilitySetter,
}: CoinRenderSlotProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerVisibilitySetter(slotIndex, setVisible);
    return () => {
      registerVisibilitySetter(slotIndex, null);
    };
  }, [registerVisibilitySetter, slotIndex]);

  return visible ? (
    <CoinVisual shared={shared} animFrameIndex={animFrameIndex} />
  ) : null;
});

type CoinRendererProps = {
  viewport: ViewportSize;
};

export const CoinRenderer = memo(function CoinRenderer({ viewport }: CoinRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  const slots = useMemo(() => {
    const list: CoinSlotShared[] = new Array(MAX_COINS);
    for (let index = 0; index < MAX_COINS; index += 1) {
      list[index] = createCoinSlotShared();
    }
    return list;
  }, []);
  const lastCoinIdRef = useRef(new Int32Array(MAX_COINS));
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(MAX_COINS).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(MAX_COINS));

  const registerVisibilitySetter = useCallback(
    (
      slotIndex: number,
      setter: ((visible: boolean) => void) | null,
    ) => {
      visibilitySettersRef.current[slotIndex] = setter;
      setter?.(visibleSlotsRef.current[slotIndex] === 1);
    },
    [],
  );

  useEffect(() => {
    const margin = getCoinRenderMargin();
    const visibleSlots = visibleSlotsRef.current;
    const setSlotVisible = (slotIndex: number, visible: boolean): void => {
      const nextValue = visible ? 1 : 0;
      if (visibleSlots[slotIndex] === nextValue) {
        return;
      }
      visibleSlots[slotIndex] = nextValue;
      visibilitySettersRef.current[slotIndex]?.(visible);
    };

    return engine.onPlayingFrame(() => {
      const elapsedMs = engine.timeRef.current.elapsedMs;
      writeSharedNumber(
        animFrameIndex,
        Math.floor(elapsedMs / COIN_FRAME_MS) % COIN_FRAME_COUNT,
      );

      const coins = engine.coinRef.current.coins;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      const lastCoinId = lastCoinIdRef.current;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);

      for (let slotIndex = 0; slotIndex < MAX_COINS; slotIndex += 1) {
        const slot = slots[slotIndex];
        const coin = coins[slotIndex];

        if (!coin.active) {
          lastCoinId[slotIndex] = 0;
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const localLeft = coin.worldX - coin.width * 0.5;
        const localTop = -coin.worldY - coin.height * 0.5;
        const screenLeft = localLeft - nextCameraOffsetX;
        const screenTop = localTop + nextScrollOffsetY;

        if (
          screenLeft + coin.width < -margin ||
          screenLeft > viewportWidth + margin ||
          screenTop + coin.height < -margin ||
          screenTop > viewportHeight + margin
        ) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        if (lastCoinId[slotIndex] !== coin.id) {
          lastCoinId[slotIndex] = coin.id;
          writeSharedNumber(slot.left, localLeft);
          writeSharedNumber(slot.top, localTop);
          writeSharedNumber(slot.size, coin.width);
        }
        writeSharedNumber(slot.opacity, 1);
        setSlotVisible(slotIndex, true);
      }
    });
  }, [
    animFrameIndex,
    cameraOffsetX,
    engine,
    scrollOffsetY,
    slots,
    viewport.height,
    viewport.width,
  ]);

  const layerTransformStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: -cameraOffsetX.value },
      { translateY: scrollOffsetY.value },
    ] as ViewStyle['transform'],
  }));
  const animatedLayerStyle = useMemo(
    () => [layerStyle.root, layerTransformStyle],
    [layerTransformStyle],
  );

  const renderSlot = useCallback(
    (slotIndex: number) => (
      <CoinRenderSlot
        key={slotIndex}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        animFrameIndex={animFrameIndex}
        registerVisibilitySetter={registerVisibilitySetter}
      />
    ),
    [animFrameIndex, registerVisibilitySetter, slots],
  );
  const slotElements = useMemo(() => COIN_SLOT_INDICES.map(renderSlot), [renderSlot]);

  return (
    <Animated.View
      style={animatedLayerStyle}
      pointerEvents="none"
    >
      {slotElements}
    </Animated.View>
  );
});
