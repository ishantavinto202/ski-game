import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { GAME_CONFIG } from '../utils/GameConfig';
import { writeSharedNumber } from '../utils/shared-value-write';

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

  const rootStyle = useMemo(
    () => [styles.root, { top: insets.top + HUD_TOP_OFFSET }],
    [insets.top],
  );

  useEffect(() => {
    const speedPool = engine.speedBoostRef.current;
    const shieldPool = engine.shieldRef.current;

    writeSharedNumber(speedActive, speedPool.isSpeedBoostActive ? 1 : 0);
    writeSharedNumber(
      speedFillWidth,
      speedPool.isSpeedBoostActive
        ? Math.round(
            clampRatio(speedPool.remainingSpeedBoostMs, SPEED_TOTAL_MS) *
              EFFECT_DURATION_BAR_WIDTH,
          )
        : 0,
    );

    writeSharedNumber(shieldActive, shieldPool.isShieldActive ? 1 : 0);
    writeSharedNumber(
      shieldFillWidth,
      shieldPool.isShieldActive
        ? Math.round(
            clampRatio(shieldPool.remainingShieldMs, SHIELD_TOTAL_MS) *
              EFFECT_DURATION_BAR_WIDTH,
          )
        : 0,
    );

    return engine.onPlayingFrame(() => {
      const speedBoost = engine.speedBoostRef.current;
      const speedIsActive = speedBoost.isSpeedBoostActive;
      writeSharedNumber(speedActive, speedIsActive ? 1 : 0);
      writeSharedNumber(
        speedFillWidth,
        speedIsActive
          ? Math.round(
              clampRatio(speedBoost.remainingSpeedBoostMs, SPEED_TOTAL_MS) *
                EFFECT_DURATION_BAR_WIDTH,
            )
          : 0,
      );

      const shield = engine.shieldRef.current;
      const shieldIsActive = shield.isShieldActive;
      writeSharedNumber(shieldActive, shieldIsActive ? 1 : 0);
      writeSharedNumber(
        shieldFillWidth,
        shieldIsActive
          ? Math.round(
              clampRatio(shield.remainingShieldMs, SHIELD_TOTAL_MS) *
                EFFECT_DURATION_BAR_WIDTH,
            )
          : 0,
      );
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
  const speedClusterCompositeStyle = useMemo(
    () => [styles.cluster, speedClusterStyle],
    [speedClusterStyle],
  );
  const speedFillCompositeStyle = useMemo(
    () => [styles.speedFill, speedFillStyle],
    [speedFillStyle],
  );
  const shieldClusterCompositeStyle = useMemo(
    () => [styles.cluster, shieldClusterStyle],
    [shieldClusterStyle],
  );
  const shieldFillCompositeStyle = useMemo(
    () => [styles.shieldFill, shieldFillStyle],
    [shieldFillStyle],
  );

  return (
    <View style={rootStyle} pointerEvents="none">
      <View style={styles.stack}>
        <Animated.View style={speedClusterCompositeStyle}>
          <Text style={styles.label}>⚡ SPEED</Text>
          <View style={styles.track}>
            <Animated.View style={speedFillCompositeStyle} />
          </View>
        </Animated.View>

        <Animated.View style={shieldClusterCompositeStyle}>
          <Text style={styles.label}>🛡 SHIELD</Text>
          <View style={styles.track}>
            <Animated.View style={shieldFillCompositeStyle} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

/** @deprecated Use ActiveEffectDurationHud (includes speed + shield bars). */
export const SpeedBoostDurationHud = ActiveEffectDurationHud;
