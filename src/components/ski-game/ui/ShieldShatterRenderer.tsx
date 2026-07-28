import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  getShieldShatterPool,
  getShieldShatterSlotIndices,
  SHIELD_SHATTER_OPACITY_MAX,
  SHIELD_SHATTER_RENDER_MARGIN,
  tickShieldShatter,
} from '../effects/ShieldShatter';
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
    backgroundColor: SKI_GAME_COLORS.shieldShatterFragment,
  },
});

const SHATTER_SLOT_INDICES = getShieldShatterSlotIndices();

type ShieldShatterSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const ShieldShatterSlot = memo(function ShieldShatterSlot({
  slotIndex,
  viewport,
}: ShieldShatterSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const size = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  const fragmentStyle = useMemo(() => layerStyle.fragment, []);

  useEffect(() => {
    return engine.onFrame(() => {
      const pool = getShieldShatterPool(engine);
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
      const diameter = particle.size * (0.4 + 0.6 * clampedLife);
      const rectLeft = particle.worldX - cameraOffsetX - diameter * 0.5;
      const rectTop =
        worldYCenterToScreenY(scrollOffsetY, particle.worldY) - diameter * 0.5;
      const margin = SHIELD_SHATTER_RENDER_MARGIN;

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
      opacity.value = clampedLife * SHIELD_SHATTER_OPACITY_MAX;
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

type ShieldShatterRendererProps = {
  viewport: ViewportSize;
};

export const ShieldShatterRenderer = memo(function ShieldShatterRenderer({
  viewport,
}: ShieldShatterRendererProps) {
  const engine = useGameEngineContext();
  const lastFrameMsRef = useRef(0);

  useEffect(() => {
    lastFrameMsRef.current = 0;

    return engine.onFrame(() => {
      const now = performance.now();
      const deltaMs = lastFrameMsRef.current > 0 ? now - lastFrameMsRef.current : 0;
      lastFrameMsRef.current = now;
      tickShieldShatter(engine, deltaMs);
    });
  }, [engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SHATTER_SLOT_INDICES.map((slotIndex) => (
        <ShieldShatterSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
