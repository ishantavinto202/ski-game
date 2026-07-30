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
import { GAME_CONFIG } from '../utils/GameConfig';
import { writeSharedNumber } from '../utils/shared-value-write';
import {
  SNOW_SURFACE_ASSET_COUNT,
  SNOW_SURFACE_ASSETS,
} from '../utils/snow-surface-assets';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const MAX_DETAILS = GAME_CONFIG.MAX_SNOW_SURFACE_DETAILS;

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  assetImage: {
    position: 'absolute',
  },
});

const DETAIL_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_DETAILS; index += 1) {
  DETAIL_SLOT_INDICES.push(index);
}

type SnowSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
};

function createSnowSlotShared(): SnowSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    width: makeMutable(0),
    height: makeMutable(0),
    opacity: makeMutable(0),
  };
}

type SnowSurfaceRenderSlotProps = {
  slotIndex: number;
  shared: SnowSlotShared;
  registerTypeSetter: (
    slotIndex: number,
    setter: ((typeIndex: number) => void) | null,
  ) => void;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

type SnowSurfaceVisualProps = {
  source: number;
  shared: SnowSlotShared;
};

const SnowSurfaceVisual = memo(function SnowSurfaceVisual({
  source,
  shared,
}: SnowSurfaceVisualProps) {
  const imageStyle = useMemo(() => layerStyle.assetImage, []);
  const animatedStyle = useAnimatedStyle(() => ({
    left: shared.left.value,
    top: shared.top.value,
    width: shared.width.value,
    height: shared.height.value,
    opacity: shared.opacity.value,
  }));
  const compositeStyle = useMemo(
    () => [imageStyle, animatedStyle],
    [animatedStyle, imageStyle],
  );

  return (
    <AnimatedImage
      source={source}
      style={compositeStyle}
      resizeMode="contain"
    />
  );
});

const SnowSurfaceRenderSlot = memo(function SnowSurfaceRenderSlot({
  slotIndex,
  shared,
  registerTypeSetter,
  registerVisibilitySetter,
}: SnowSurfaceRenderSlotProps) {
  const [typeIndex, setTypeIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerTypeSetter(slotIndex, setTypeIndex);
    registerVisibilitySetter(slotIndex, setVisible);
    return () => {
      registerTypeSetter(slotIndex, null);
      registerVisibilitySetter(slotIndex, null);
    };
  }, [registerTypeSetter, registerVisibilitySetter, slotIndex]);

  if (!visible) {
    return null;
  }
  const source =
    typeIndex >= 0 && typeIndex < SNOW_SURFACE_ASSET_COUNT
      ? SNOW_SURFACE_ASSETS[typeIndex].source
      : SNOW_SURFACE_ASSETS[0].source;
  return <SnowSurfaceVisual source={source} shared={shared} />;
});

type SnowSurfaceRendererProps = {
  viewport: ViewportSize;
};

export const SnowSurfaceRenderer = memo(function SnowSurfaceRenderer({
  viewport,
}: SnowSurfaceRendererProps) {
  const engine = useGameEngineContext();

  const slots = useMemo(() => {
    const list: SnowSlotShared[] = new Array(MAX_DETAILS);
    for (let index = 0; index < MAX_DETAILS; index += 1) {
      list[index] = createSnowSlotShared();
    }
    return list;
  }, []);

  const typeSettersRef = useRef<(((typeIndex: number) => void) | null)[]>(
    new Array(MAX_DETAILS).fill(null),
  );
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(MAX_DETAILS).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(MAX_DETAILS));
  const lastTypeIndexRef = useRef(new Int16Array(MAX_DETAILS).fill(-1));
  const lastWorldXRef = useRef(new Float64Array(MAX_DETAILS).fill(Number.NaN));
  const lastWorldYRef = useRef(new Float64Array(MAX_DETAILS).fill(Number.NaN));
  const lastWidthRef = useRef(new Float64Array(MAX_DETAILS).fill(Number.NaN));
  const lastHeightRef = useRef(new Float64Array(MAX_DETAILS).fill(Number.NaN));
  const cameraOffsetX = useSharedValue(0);
  const scrollOffsetY = useSharedValue(0);

  const registerTypeSetter = useCallback(
    (slotIndex: number, setter: ((typeIndex: number) => void) | null) => {
      typeSettersRef.current[slotIndex] = setter;
    },
    [],
  );
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
    const margin = GAME_CONFIG.SNOW_SURFACE_RENDER_MARGIN;
    const lastTypeIndex = lastTypeIndexRef.current;
    const lastWorldX = lastWorldXRef.current;
    const lastWorldY = lastWorldYRef.current;
    const lastWidth = lastWidthRef.current;
    const lastHeight = lastHeightRef.current;
    const targetOpacity = GAME_CONFIG.SNOW_SURFACE_OPACITY;
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
      const details = engine.snowSurfaceRef.current.details;
      const nextScrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const nextCameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      writeSharedNumber(scrollOffsetY, nextScrollOffsetY);
      writeSharedNumber(cameraOffsetX, nextCameraOffsetX);
      let mountsRemaining =
        GAME_CONFIG.VISUAL_PRELOAD_MOUNTS_PER_RENDERER_FRAME;

      for (let slotIndex = 0; slotIndex < MAX_DETAILS; slotIndex += 1) {
        const slot = slots[slotIndex];
        const detail = details[slotIndex];

        if (!detail.active) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const localLeft = detail.worldX - detail.width * 0.5;
        const localTop = -detail.worldY - detail.height * 0.5;
        const screenLeft = localLeft - nextCameraOffsetX;
        const screenTop = localTop + nextScrollOffsetY;

        if (
          screenLeft + detail.width < -margin ||
          screenLeft > viewportWidth + margin ||
          screenTop + detail.height < -margin ||
          screenTop > viewportHeight + margin
        ) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        if (visibleSlots[slotIndex] === 0) {
          if (mountsRemaining <= 0) {
            writeSharedNumber(slot.opacity, 0);
            continue;
          }
          mountsRemaining -= 1;
        }

        if (
          lastWorldX[slotIndex] !== detail.worldX ||
          lastWorldY[slotIndex] !== detail.worldY ||
          lastWidth[slotIndex] !== detail.width ||
          lastHeight[slotIndex] !== detail.height
        ) {
          lastWorldX[slotIndex] = detail.worldX;
          lastWorldY[slotIndex] = detail.worldY;
          lastWidth[slotIndex] = detail.width;
          lastHeight[slotIndex] = detail.height;
          writeSharedNumber(slot.left, localLeft);
          writeSharedNumber(slot.top, localTop);
          writeSharedNumber(slot.width, detail.width);
          writeSharedNumber(slot.height, detail.height);
        }
        writeSharedNumber(slot.opacity, targetOpacity);

        if (lastTypeIndex[slotIndex] !== detail.typeIndex) {
          lastTypeIndex[slotIndex] = detail.typeIndex;
          typeSettersRef.current[slotIndex]?.(detail.typeIndex);
        }
        setSlotVisible(slotIndex, true);
      }
    });
  }, [
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
      <SnowSurfaceRenderSlot
        key={slotIndex}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        registerTypeSetter={registerTypeSetter}
        registerVisibilitySetter={registerVisibilitySetter}
      />
    ),
    [registerTypeSetter, registerVisibilitySetter, slots],
  );
  const slotElements = useMemo(
    () => DETAIL_SLOT_INDICES.map(renderSlot),
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
