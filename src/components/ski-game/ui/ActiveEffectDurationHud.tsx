import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';

import { HUD_TOP_OFFSET } from './HudStyles';

export const EFFECT_DURATION_BAR_WIDTH = 160;
export const EFFECT_DURATION_BAR_HEIGHT = 10;

const SPEED_TOTAL_MS = GAME_CONFIG.SPEED_BOOST_DURATION_MS;
const SHIELD_TOTAL_MS = GAME_CONFIG.SHIELD_DURATION_MS;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stack: {
    alignItems: 'center',
    gap: 8,
  },
  cluster: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
  },
  track: {
    width: EFFECT_DURATION_BAR_WIDTH,
    height: EFFECT_DURATION_BAR_HEIGHT,
    borderRadius: EFFECT_DURATION_BAR_HEIGHT * 0.5,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    overflow: 'hidden',
  },
  speedFill: {
    height: EFFECT_DURATION_BAR_HEIGHT,
    borderRadius: EFFECT_DURATION_BAR_HEIGHT * 0.5,
    backgroundColor: SKI_GAME_COLORS.speedBoostPlaceholder,
  },
  shieldFill: {
    height: EFFECT_DURATION_BAR_HEIGHT,
    borderRadius: EFFECT_DURATION_BAR_HEIGHT * 0.5,
    backgroundColor: SKI_GAME_COLORS.shieldDurationBarFill,
  },
});

function clampRatio(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) {
    return 0;
  }
  const ratio = remainingMs / totalMs;
  if (ratio < 0) {
    return 0;
  }
  if (ratio > 1) {
    return 1;
  }
  return ratio;
}

export const ActiveEffectDurationHud = memo(function ActiveEffectDurationHud() {
  const engine = useGameEngineContext();
  const insets = useSafeAreaInsets();

  const speedActive = useSharedValue(0);
  const speedFillWidth = useSharedValue(0);
  const shieldActive = useSharedValue(0);
  const shieldFillWidth = useSharedValue(0);

  const rootTop = useMemo(() => insets.top + HUD_TOP_OFFSET, [insets.top]);

  useEffect(() => {
    const speedPool = engine.speedBoostRef.current;
    const shieldPool = engine.shieldRef.current;

    speedActive.value = speedPool.isSpeedBoostActive ? 1 : 0;
    speedFillWidth.value = speedPool.isSpeedBoostActive
      ? clampRatio(speedPool.remainingSpeedBoostMs, SPEED_TOTAL_MS) * EFFECT_DURATION_BAR_WIDTH
      : 0;

    shieldActive.value = shieldPool.isShieldActive ? 1 : 0;
    shieldFillWidth.value = shieldPool.isShieldActive
      ? clampRatio(shieldPool.remainingShieldMs, SHIELD_TOTAL_MS) * EFFECT_DURATION_BAR_WIDTH
      : 0;

    return engine.onFrame(() => {
      const speedBoost = engine.speedBoostRef.current;
      const speedIsActive = speedBoost.isSpeedBoostActive;
      speedActive.value = speedIsActive ? 1 : 0;
      speedFillWidth.value = speedIsActive
        ? clampRatio(speedBoost.remainingSpeedBoostMs, SPEED_TOTAL_MS) * EFFECT_DURATION_BAR_WIDTH
        : 0;

      const shield = engine.shieldRef.current;
      const shieldIsActive = shield.isShieldActive;
      shieldActive.value = shieldIsActive ? 1 : 0;
      shieldFillWidth.value = shieldIsActive
        ? clampRatio(shield.remainingShieldMs, SHIELD_TOTAL_MS) * EFFECT_DURATION_BAR_WIDTH
        : 0;
    });
  }, [engine, shieldActive, shieldFillWidth, speedActive, speedFillWidth]);

  const speedClusterStyle = useAnimatedStyle(() => ({
    opacity: speedActive.value > 0 ? 1 : 0,
  }));

  const shieldClusterStyle = useAnimatedStyle(() => ({
    opacity: shieldActive.value > 0 ? 1 : 0,
  }));

  const speedFillStyle = useAnimatedStyle(() => ({
    width: speedFillWidth.value,
  }));

  const shieldFillStyle = useAnimatedStyle(() => ({
    width: shieldFillWidth.value,
  }));

  return (
    <View style={[styles.root, { top: rootTop }]} pointerEvents="none">
      <View style={styles.stack}>
        <Animated.View style={[styles.cluster, speedClusterStyle]}>
          <Text style={styles.label}>⚡ SPEED</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.speedFill, speedFillStyle]} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.cluster, shieldClusterStyle]}>
          <Text style={styles.label}>🛡 SHIELD</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.shieldFill, shieldFillStyle]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

/** @deprecated Use ActiveEffectDurationHud (includes speed + shield bars). */
export const SpeedBoostDurationHud = ActiveEffectDurationHud;
