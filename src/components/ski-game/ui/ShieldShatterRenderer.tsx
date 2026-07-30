import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  getShieldShatterPool,
  getShieldShatterSlotIndices,
  SHIELD_SHATTER_FRAGMENT_COUNT_MAX,
  SHIELD_SHATTER_OPACITY_MAX,
  SHIELD_SHATTER_RENDER_MARGIN,
  tickShieldShatter,
} from '../effects/ShieldShatter';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { writeSharedNumber } from '../utils/shared-value-write';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  fragment: {
    position: 'absolute',
    backgroundColor: SKI_GAME_COLORS.shieldShatterFragment,
  },
});

const SHATTER_SLOT_INDICES = getShieldShatterSlotIndices();
const SHATTER_SLOT_COUNT = SHATTER_SLOT_INDICES.length;

type ShatterSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  size: SharedValue<number>;
  opacity: SharedValue<number>;
  rotation: SharedValue<number>;
};

function createShatterSlotShared(): ShatterSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    size: makeMutable(0),
    opacity: makeMutable(0),
    rotation: makeMutable(0),
  };
}

type ShieldShatterVisualProps = {
  shared: ShatterSlotShared;
};

const ShieldShatterVisual = memo(function ShieldShatterVisual({
  shared,
}: ShieldShatterVisualProps) {
  const fragmentStyle = useMemo(() => layerStyle.fragment, []);

  const animatedStyle = useAnimatedStyle(() => {
    const diameter = shared.size.value;
    return {
      left: shared.left.value,
      top: shared.top.value,
      width: diameter,
      height: diameter,
      borderRadius: diameter * 0.5,
      opacity: shared.opacity.value,
      transform: [{ rotate: `${shared.rotation.value}deg` }],
    };
  });
  const compositeStyle = useMemo(
    () => [fragmentStyle, animatedStyle],
    [animatedStyle, fragmentStyle],
  );

  return <Animated.View style={compositeStyle} pointerEvents="none" />;
});

type ShieldShatterSlotProps = {
  alwaysMounted: boolean;
  slotIndex: number;
  shared: ShatterSlotShared;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

const ShieldShatterSlot = memo(function ShieldShatterSlot({
  alwaysMounted,
  slotIndex,
  shared,
  registerVisibilitySetter,
}: ShieldShatterSlotProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alwaysMounted) {
      return;
    }
    registerVisibilitySetter(slotIndex, setVisible);
    return () => {
      registerVisibilitySetter(slotIndex, null);
    };
  }, [alwaysMounted, registerVisibilitySetter, slotIndex]);

  return alwaysMounted || visible ? (
    <ShieldShatterVisual shared={shared} />
  ) : null;
});

type ShieldShatterRendererProps = {
  viewport: ViewportSize;
};

export const ShieldShatterRenderer = memo(function ShieldShatterRenderer({
  viewport,
}: ShieldShatterRendererProps) {
  const engine = useGameEngineContext();
  const lastFrameMsRef = useRef(0);

  const slots = useMemo(() => {
    const list: ShatterSlotShared[] = new Array(SHATTER_SLOT_COUNT);
    for (let index = 0; index < SHATTER_SLOT_COUNT; index += 1) {
      list[index] = createShatterSlotShared();
    }
    return list;
  }, []);
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(SHATTER_SLOT_COUNT).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(SHATTER_SLOT_COUNT));

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
    lastFrameMsRef.current = 0;
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
      const now = performance.now();
      const deltaMs = lastFrameMsRef.current > 0 ? now - lastFrameMsRef.current : 0;
      lastFrameMsRef.current = now;
      tickShieldShatter(engine, deltaMs);

      const pool = getShieldShatterPool(engine);
      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      const margin = SHIELD_SHATTER_RENDER_MARGIN;

      for (let slotIndex = 0; slotIndex < SHATTER_SLOT_COUNT; slotIndex += 1) {
        const slot = slots[slotIndex];
        const particle = pool.particles[slotIndex];

        if (!particle.active) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const lifeRatio =
          particle.totalLifeMs > 0 ? particle.remainingLifeMs / particle.totalLifeMs : 0;
        const clampedLife = lifeRatio < 0 ? 0 : lifeRatio > 1 ? 1 : lifeRatio;
        const diameter = particle.size * (0.4 + 0.6 * clampedLife);
        const rectLeft = particle.worldX - cameraOffsetX - diameter * 0.5;
        const rectTop =
          worldYCenterToScreenY(scrollOffsetY, particle.worldY) - diameter * 0.5;

        if (
          rectLeft + diameter < -margin ||
          rectLeft > viewportWidth + margin ||
          rectTop + diameter < -margin ||
          rectTop > viewportHeight + margin
        ) {
          setSlotVisible(slotIndex, false);
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        writeSharedNumber(slot.left, rectLeft);
        writeSharedNumber(slot.top, rectTop);
        writeSharedNumber(slot.size, diameter);
        writeSharedNumber(slot.opacity, clampedLife * SHIELD_SHATTER_OPACITY_MAX);
        writeSharedNumber(slot.rotation, particle.rotation);
        setSlotVisible(slotIndex, true);
      }
    });
  }, [engine, slots, viewport.height, viewport.width]);

  const renderSlot = useCallback(
    (slotIndex: number) => (
      <ShieldShatterSlot
        key={slotIndex}
        alwaysMounted={slotIndex < SHIELD_SHATTER_FRAGMENT_COUNT_MAX}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        registerVisibilitySetter={registerVisibilitySetter}
      />
    ),
    [registerVisibilitySetter, slots],
  );
  const slotElements = useMemo(
    () => SHATTER_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {slotElements}
    </View>
  );
});
