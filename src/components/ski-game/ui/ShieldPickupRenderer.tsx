import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { shieldWorldToScreenRect } from '../entities/Shield';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SHIELD_WORLD_SIZE } from '../types/ShieldTypes';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';
import { getShieldRenderMargin, isShieldRectVisible } from '../utils/shield-render';

const SHIELD_PICKUP_BORDER_WIDTH = 3;
const SHIELD_PICKUP_ICON = '🛡';

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKI_GAME_COLORS.shieldPickupFill,
    borderWidth: SHIELD_PICKUP_BORDER_WIDTH,
    borderColor: SKI_GAME_COLORS.shieldPickupBorder,
  },
  icon: {
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
    color: SKI_GAME_COLORS.shieldPickupIcon,
  },
});

const SHIELD_SLOT_INDICES: number[] = [];
for (let index = 0; index < GAME_CONFIG.MAX_SHIELDS; index += 1) {
  SHIELD_SLOT_INDICES.push(index);
}

type ShieldPickupRenderSlotProps = {
  slotIndex: number;
  viewport: ViewportSize;
};

const ShieldPickupRenderSlot = memo(function ShieldPickupRenderSlot({
  slotIndex,
  viewport,
}: ShieldPickupRenderSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const size = useSharedValue<number>(SHIELD_WORLD_SIZE.width);
  const opacity = useSharedValue(0);

  const badgeStyle = useMemo(() => layerStyle.badge, []);
  const iconStyle = useMemo(() => layerStyle.icon, []);

  useEffect(() => {
    const margin = getShieldRenderMargin();

    return engine.onFrame(() => {
      const shield = engine.shieldRef.current.shields[slotIndex];
      if (!shield.active) {
        opacity.value = 0;
        return;
      }

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const rect = shieldWorldToScreenRect(shield, scrollOffsetY, cameraOffsetX);

      if (!isShieldRectVisible(rect, viewport, margin)) {
        opacity.value = 0;
        return;
      }

      left.value = rect.left;
      top.value = rect.top;
      size.value = rect.width;
      opacity.value = 1;
    });
  }, [engine, left, opacity, size, slotIndex, top, viewport]);

  const animatedStyle = useAnimatedStyle(() => {
    const diameter = size.value;
    return {
      left: left.value,
      top: top.value,
      width: diameter,
      height: diameter,
      borderRadius: diameter * 0.5,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[badgeStyle, animatedStyle]} pointerEvents="none">
      <View pointerEvents="none">
        <Text style={iconStyle}>{SHIELD_PICKUP_ICON}</Text>
      </View>
    </Animated.View>
  );
});

type ShieldPickupRendererProps = {
  viewport: ViewportSize;
};

export const ShieldPickupRenderer = memo(function ShieldPickupRenderer({
  viewport,
}: ShieldPickupRendererProps) {
  return (
    <View style={layerStyle.root} pointerEvents="none">
      {SHIELD_SLOT_INDICES.map((slotIndex) => (
        <ShieldPickupRenderSlot key={slotIndex} slotIndex={slotIndex} viewport={viewport} />
      ))}
    </View>
  );
});
