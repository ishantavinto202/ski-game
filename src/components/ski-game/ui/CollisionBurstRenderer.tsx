import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  COLLISION_BURST_OPACITY_MAX,
  COLLISION_BURST_RENDER_MARGIN,
  getCollisionBurstPool,
  getCollisionBurstSlotIndices,
  tickCollisionBurst,
} from '../effects/CollisionBurst';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
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

type CollisionBurstSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const CollisionBurstSlot = memo(function CollisionBurstSlot({
  slotIndex,
  viewport,
}: CollisionBurstSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const size = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  const fragmentStyle = useMemo(() => layerStyle.fragment, []);

  useEffect(() => {
    return engine.onFrame(() => {
      const pool = getCollisionBurstPool(engine);
      const particle = pool.particles[slotIndex];
      if (!particle.active) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const lifeRatio =
        particle.totalLifeMs > 0 ? particle.remainingLifeMs / particle.totalLifeMs : 0;
      const clampedLife = lifeRatio < 0 ? 0 : lifeRatio > 1 ? 1 : lifeRatio;
      const diameter = particle.size * (0.45 + 0.55 * clampedLife);
      const rectLeft = particle.worldX - cameraOffsetX - diameter * 0.5;
      const rectTop =
        worldYCenterToScreenY(scrollOffsetY, particle.worldY) - diameter * 0.5;
      const margin = COLLISION_BURST_RENDER_MARGIN;

      if (
        rectLeft + diameter < -margin ||
        rectLeft > viewport.width + margin ||
        rectTop + diameter < -margin ||
        rectTop > viewport.height + margin
      ) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      left.value = rectLeft;
      top.value = rectTop;
      size.value = diameter;
      opacity.value = clampedLife * COLLISION_BURST_OPACITY_MAX;
      rotation.value = particle.rotation;
    });
  }, [engine, left, opacity, rotation, size, slotIndex, top, viewport.height, viewport.width]);

  const animatedStyle = useAnimatedStyle(() => {
    const diameter = size.value;
    return {
      left: left.value,
      top: top.value,
      width: diameter,
      height: diameter,
      borderRadius: diameter * 0.5,
      opacity: opacity.value,
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return <Animated.View style={[fragmentStyle, animatedStyle]} pointerEvents="none" />;
});

type CollisionBurstRendererProps = {
  viewport: ViewportSize;
};

export const CollisionBurstRenderer = memo(function CollisionBurstRenderer({
  viewport,
}: CollisionBurstRendererProps) {
  const engine = useGameEngineContext();
  const lastFrameMsRef = useRef(0);

  useEffect(() => {
    lastFrameMsRef.current = 0;

    return engine.onFrame(() => {
      const now = performance.now();
      const deltaMs = lastFrameMsRef.current > 0 ? now - lastFrameMsRef.current : 0;
      lastFrameMsRef.current = now;
      tickCollisionBurst(engine, deltaMs);
    });
  }, [engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {BURST_SLOT_INDICES.map((slotIndex) => (
        <CollisionBurstSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
