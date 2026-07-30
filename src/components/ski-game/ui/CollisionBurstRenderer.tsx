import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import {
  COLLISION_BURST_OPACITY_MAX,
  COLLISION_BURST_RENDER_MARGIN,
  COLLISION_BURST_FRAGMENT_COUNT_MAX,
  getCollisionBurstPool,
  getCollisionBurstSlotIndices,
  tickCollisionBurst,
} from '../effects/CollisionBurst';
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
    backgroundColor: SKI_GAME_COLORS.collisionBurstFragment,
  },
});

const BURST_SLOT_INDICES = getCollisionBurstSlotIndices();
const BURST_SLOT_COUNT = BURST_SLOT_INDICES.length;

type BurstSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  size: SharedValue<number>;
  opacity: SharedValue<number>;
  rotation: SharedValue<number>;
};

function createBurstSlotShared(): BurstSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    size: makeMutable(0),
    opacity: makeMutable(0),
    rotation: makeMutable(0),
  };
}

type CollisionBurstVisualProps = {
  shared: BurstSlotShared;
};

const CollisionBurstVisual = memo(function CollisionBurstVisual({
  shared,
}: CollisionBurstVisualProps) {
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

type CollisionBurstSlotProps = {
  alwaysMounted: boolean;
  slotIndex: number;
  shared: BurstSlotShared;
  registerVisibilitySetter: (
    slotIndex: number,
    setter: ((visible: boolean) => void) | null,
  ) => void;
};

const CollisionBurstSlot = memo(function CollisionBurstSlot({
  alwaysMounted,
  slotIndex,
  shared,
  registerVisibilitySetter,
}: CollisionBurstSlotProps) {
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
    <CollisionBurstVisual shared={shared} />
  ) : null;
});

type CollisionBurstRendererProps = {
  viewport: ViewportSize;
};

export const CollisionBurstRenderer = memo(function CollisionBurstRenderer({
  viewport,
}: CollisionBurstRendererProps) {
  const engine = useGameEngineContext();
  const lastFrameMsRef = useRef(0);

  const slots = useMemo(() => {
    const list: BurstSlotShared[] = new Array(BURST_SLOT_COUNT);
    for (let index = 0; index < BURST_SLOT_COUNT; index += 1) {
      list[index] = createBurstSlotShared();
    }
    return list;
  }, []);
  const visibilitySettersRef = useRef<
    (((visible: boolean) => void) | null)[]
  >(new Array(BURST_SLOT_COUNT).fill(null));
  const visibleSlotsRef = useRef(new Uint8Array(BURST_SLOT_COUNT));

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
      tickCollisionBurst(engine, deltaMs);

      const pool = getCollisionBurstPool(engine);
      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      const margin = COLLISION_BURST_RENDER_MARGIN;

      for (let slotIndex = 0; slotIndex < BURST_SLOT_COUNT; slotIndex += 1) {
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
        const diameter = particle.size * (0.45 + 0.55 * clampedLife);
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
        writeSharedNumber(slot.opacity, clampedLife * COLLISION_BURST_OPACITY_MAX);
        writeSharedNumber(slot.rotation, particle.rotation);
        setSlotVisible(slotIndex, true);
      }
    });
  }, [engine, slots, viewport.height, viewport.width]);

  const renderSlot = useCallback(
    (slotIndex: number) => (
      <CollisionBurstSlot
        key={slotIndex}
        alwaysMounted={slotIndex < COLLISION_BURST_FRAGMENT_COUNT_MAX}
        slotIndex={slotIndex}
        shared={slots[slotIndex]}
        registerVisibilitySetter={registerVisibilitySetter}
      />
    ),
    [registerVisibilitySetter, slots],
  );
  const slotElements = useMemo(
    () => BURST_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {slotElements}
    </View>
  );
});
