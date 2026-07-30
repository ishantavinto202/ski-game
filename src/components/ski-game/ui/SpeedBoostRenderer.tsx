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
import { SPEED_BOOST_WORLD_SIZE } from '../types/SpeedBoostTypes';
import { GAME_CONFIG } from '../utils/GameConfig';
import { getSpeedBoostRenderMargin } from '../utils/speed-boost-render';
import { writeSharedNumber } from '../utils/shared-value-write';

import speedBoostAtlasMetadata from '../../../../assets/assets/Thunder Animations/speed-boost-sprite.json';

const SPEED_BOOST_ATLAS_TEXTURE =
  require('../../../../assets/assets/Thunder Animations/speed-boost-sprite.png') as number;

/** Match ShieldPickupRenderer (~12 FPS sprite loop; independent of the 60 FPS game loop). */
const SPEED_BOOST_ANIMATION_FPS = 12;
const SPEED_BOOST_FRAME_MS = 1000 / SPEED_BOOST_ANIMATION_FPS;
const MAX_SPEED_BOOSTS = GAME_CONFIG.MAX_SPEED_BOOSTS;

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
for (let index = 0; index < MAX_SPEED_BOOSTS; index += 1) {
  SPEED_BOOST_SLOT_INDICES.push(index);
}

type SpeedBoostSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
};

function createSpeedBoostSlotShared(): SpeedBoostSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    width: makeMutable(SPEED_BOOST_WORLD_SIZE.width),
    height: makeMutable(SPEED_BOOST_WORLD_SIZE.height),
    opacity: makeMutable(0),
  };
}

type SpeedBoostVisualProps = {
  shared: SpeedBoostSlotShared;
  animFrameIndex: SharedValue<number>;
};

const SpeedBoostVisual = memo(function SpeedBoostVisual({
  shared,
  animFrameIndex,
}: SpeedBoostVisualProps) {
  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  /**
   * Same proven ShieldPickupRenderer strategy: clip = exact contain-fitted source frame
   * (174×258), centered inside the unchanged gameplay rect — never pad inside the clip.
   */
  const animatedClipStyle = useAnimatedStyle(() => {
    const boundsWidth = shared.width.value;
    const boundsHeight = shared.height.value;
    if (boundsWidth <= 0 || boundsHeight <= 0) {
      return {
        left: shared.left.value,
        top: shared.top.value,
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
      left: shared.left.value + padX,
      top: shared.top.value + padY,
      width: renderedFrameWidth,
      height: renderedFrameHeight,
      opacity: shared.opacity.value,
    };
  });

  const animatedAtlasStyle = useAnimatedStyle(() => {
    const boundsWidth = shared.width.value;
    const boundsHeight = shared.height.value;
    if (shared.opacity.value <= 0 || boundsWidth <= 0 || boundsHeight <= 0) {
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
        source={SPEED_BOOST_ATLAS_TEXTURE}
        style={atlasCompositeStyle}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type SpeedBoostRenderSlotProps = SpeedBoostVisualProps & {
  slotIndex: number;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

const SpeedBoostRenderSlot = memo(function SpeedBoostRenderSlot({
  slotIndex,
  shared,
  animFrameIndex,
  registerVisibilitySetter,
}: SpeedBoostRenderSlotProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerVisibilitySetter(slotIndex, setVisible);
    return () => {
      registerVisibilitySetter(slotIndex, null);
    };
  }, [registerVisibilitySetter, slotIndex]);

  return visible ? (
    <SpeedBoostVisual shared={shared} animFrameIndex={animFrameIndex} />
  ) : null;
});

type SpeedBoostRendererProps = {
  viewport: ViewportSize;
};

export const SpeedBoostRenderer = memo(function SpeedBoostRenderer({
  viewport,
}: SpeedBoostRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  const slots = useMemo(() => {
    const list: SpeedBoostSlotShared[] = new Array(MAX_SPEED_BOOSTS);
    for (let index = 0; index < MAX_SPEED_BOOSTS; index += 1) {
      list[index] = createSpeedBoostSlotShared();
    }
    return list;
  }, []);
  const lastSpeedBoostIdRef = useRef(new Int32Array(MAX_SPEED_BOOSTS));
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(MAX_SPEED_BOOSTS).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(MAX_SPEED_BOOSTS));

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
    const margin = getSpeedBoostRenderMargin();
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
        Math.floor(elapsedMs / SPEED_BOOST_FRAME_MS) % SPEED_BOOST_FRAME_COUNT,
      );

      const speedBoosts = engine.speedBoostRef.current.speedBoosts;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      const lastSpeedBoostId = lastSpeedBoostIdRef.current;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);

      for (let slotIndex = 0; slotIndex < MAX_SPEED_BOOSTS; slotIndex += 1) {
        const slot = slots[slotIndex];
        const speedBoost = speedBoosts[slotIndex];

        if (!speedBoost.active) {
          lastSpeedBoostId[slotIndex] = 0;
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const localLeft = speedBoost.worldX - speedBoost.width * 0.5;
        const localTop = -speedBoost.worldY - speedBoost.height * 0.5;
        const screenLeft = localLeft - nextCameraOffsetX;
        const screenTop = localTop + nextScrollOffsetY;

        if (
          screenLeft + speedBoost.width < -margin ||
          screenLeft > viewportWidth + margin ||
          screenTop + speedBoost.height < -margin ||
          screenTop > viewportHeight + margin
        ) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        if (lastSpeedBoostId[slotIndex] !== speedBoost.id) {
          lastSpeedBoostId[slotIndex] = speedBoost.id;
          writeSharedNumber(slot.left, localLeft);
          writeSharedNumber(slot.top, localTop);
          writeSharedNumber(slot.width, speedBoost.width);
          writeSharedNumber(slot.height, speedBoost.height);
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
      <SpeedBoostRenderSlot
        key={slotIndex}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        animFrameIndex={animFrameIndex}
        registerVisibilitySetter={registerVisibilitySetter}
      />
    ),
    [animFrameIndex, registerVisibilitySetter, slots],
  );
  const slotElements = useMemo(
    () => SPEED_BOOST_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  return (
    <Animated.View
      style={animatedLayerStyle}
      pointerEvents="none"
    >
      {slotElements}
    </Animated.View>
  );
});
