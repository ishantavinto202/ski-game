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
import { SHIELD_WORLD_SIZE } from '../types/ShieldTypes';
import { GAME_CONFIG } from '../utils/GameConfig';
import { getShieldRenderMargin } from '../utils/shield-render';
import { writeSharedNumber } from '../utils/shared-value-write';

import shieldAtlasMetadata from '../../../../assets/assets/Shield Animations/shield-sprite.json';

const SHIELD_ATLAS_TEXTURE = require('../../../../assets/assets/Shield Animations/shield-sprite.png') as number;

/** ~12–15 FPS sprite loop; independent of the 60 FPS game loop. */
const SHIELD_ANIMATION_FPS = 12;
const SHIELD_FRAME_MS = 1000 / SHIELD_ANIMATION_FPS;
const MAX_SHIELDS = GAME_CONFIG.MAX_SHIELDS;

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
for (let index = 0; index < MAX_SHIELDS; index += 1) {
  SHIELD_SLOT_INDICES.push(index);
}

type ShieldSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
};

function createShieldSlotShared(): ShieldSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    width: makeMutable(SHIELD_WORLD_SIZE.width),
    height: makeMutable(SHIELD_WORLD_SIZE.height),
    opacity: makeMutable(0),
  };
}

type ShieldPickupVisualProps = {
  shared: ShieldSlotShared;
  animFrameIndex: SharedValue<number>;
};

const ShieldPickupVisual = memo(function ShieldPickupVisual({
  shared,
  animFrameIndex,
}: ShieldPickupVisualProps) {
  const clipStyle = useMemo(() => layerStyle.clip, []);
  const atlasImageStyle = useMemo(() => layerStyle.atlasImage, []);

  /**
   * Clip viewport = exactly one scaled source frame (179×196), contain-fit + centered
   * inside the gameplay rect. Must NOT use the full square bounds as the clip — that
   * letterbox pad previously exposed neighboring atlas columns on left/right.
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
        source={SHIELD_ATLAS_TEXTURE}
        style={atlasCompositeStyle}
        resizeMode="stretch"
      />
    </Animated.View>
  );
});

type ShieldPickupRenderSlotProps = ShieldPickupVisualProps & {
  slotIndex: number;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

const ShieldPickupRenderSlot = memo(function ShieldPickupRenderSlot({
  slotIndex,
  shared,
  animFrameIndex,
  registerVisibilitySetter,
}: ShieldPickupRenderSlotProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerVisibilitySetter(slotIndex, setVisible);
    return () => {
      registerVisibilitySetter(slotIndex, null);
    };
  }, [registerVisibilitySetter, slotIndex]);

  return visible ? (
    <ShieldPickupVisual
      shared={shared}
      animFrameIndex={animFrameIndex}
    />
  ) : null;
});

type ShieldPickupRendererProps = {
  viewport: ViewportSize;
};

export const ShieldPickupRenderer = memo(function ShieldPickupRenderer({
  viewport,
}: ShieldPickupRendererProps) {
  const engine = useGameEngineContext();
  const animFrameIndex = useSharedValue(0);
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  const slots = useMemo(() => {
    const list: ShieldSlotShared[] = new Array(MAX_SHIELDS);
    for (let index = 0; index < MAX_SHIELDS; index += 1) {
      list[index] = createShieldSlotShared();
    }
    return list;
  }, []);
  const lastShieldIdRef = useRef(new Int32Array(MAX_SHIELDS));
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(MAX_SHIELDS).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(MAX_SHIELDS));

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
    const margin = getShieldRenderMargin();
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
        Math.floor(elapsedMs / SHIELD_FRAME_MS) % SHIELD_FRAME_COUNT,
      );

      const shields = engine.shieldRef.current.shields;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      const lastShieldId = lastShieldIdRef.current;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);

      for (let slotIndex = 0; slotIndex < MAX_SHIELDS; slotIndex += 1) {
        const slot = slots[slotIndex];
        const shield = shields[slotIndex];

        if (!shield.active) {
          lastShieldId[slotIndex] = 0;
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const localLeft = shield.worldX - shield.width * 0.5;
        const localTop = -shield.worldY - shield.height * 0.5;
        const screenLeft = localLeft - nextCameraOffsetX;
        const screenTop = localTop + nextScrollOffsetY;

        if (
          screenLeft + shield.width < -margin ||
          screenLeft > viewportWidth + margin ||
          screenTop + shield.height < -margin ||
          screenTop > viewportHeight + margin
        ) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        if (lastShieldId[slotIndex] !== shield.id) {
          lastShieldId[slotIndex] = shield.id;
          writeSharedNumber(slot.left, localLeft);
          writeSharedNumber(slot.top, localTop);
          writeSharedNumber(slot.width, shield.width);
          writeSharedNumber(slot.height, shield.height);
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
      <ShieldPickupRenderSlot
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
    () => SHIELD_SLOT_INDICES.map(renderSlot),
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
