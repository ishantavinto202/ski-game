import { memo, useEffect, useMemo } from 'react';
import { Text, TextInput, View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';

import {
  HUD_HORIZONTAL_INSET,
  HUD_PAUSE_CLEARANCE,
  HUD_TOP_OFFSET,
  hudStyles,
} from './HudStyles';
import { ActiveEffectDurationHud } from './ActiveEffectDurationHud';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type HudHeartProps = {
  index: number;
  currentHealth: SharedValue<number>;
};

const HudHeart = memo(function HudHeart({ index, currentHealth }: HudHeartProps) {
  const heartStyle = useAnimatedStyle(() => ({
    opacity: index < currentHealth.value ? 1 : 0.35,
  }));

  return <Animated.Text style={[hudStyles.heart, heartStyle]}>♥</Animated.Text>;
});

type HudNumberFieldProps = {
  sharedValue: SharedValue<number>;
  suffix?: string;
  style?: TextStyle;
};

const HudNumberField = memo(function HudNumberField({ sharedValue, suffix = '', style }: HudNumberFieldProps) {
  const animatedProps = useAnimatedProps(() => {
    const value = Math.floor(sharedValue.value);
    const text = suffix.length > 0 ? `${value}${suffix}` : `${value}`;
    return {
      text,
      defaultValue: text,
    };
  });

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      style={[hudStyles.metricValue, style]}
      animatedProps={animatedProps}
    />
  );
});

export const Hud = memo(function Hud() {
  const engine = useGameEngineContext();
  const insets = useSafeAreaInsets();

  const currentHealth = useSharedValue<number>(GAME_CONFIG.PLAYER_MAX_HEALTH);
  const currentScore = useSharedValue<number>(0);
  const totalDistance = useSharedValue<number>(0);

  const top = insets.top + HUD_TOP_OFFSET;
  const left = insets.left + HUD_HORIZONTAL_INSET;
  const maxClusterWidth = useMemo(
    () => ({
      maxWidth: '100%' as const,
      paddingRight: insets.right + HUD_PAUSE_CLEARANCE,
    }),
    [insets.right],
  );

  const clusterStyle = useMemo(
    () => [hudStyles.topCluster, { top, left }, maxClusterWidth],
    [left, maxClusterWidth, top],
  );

  const heartIndices = useMemo(() => {
    const maxHearts = GAME_CONFIG.PLAYER_MAX_HEALTH;
    const indices: number[] = [];
    for (let index = 0; index < maxHearts; index += 1) {
      indices.push(index);
    }
    return indices;
  }, []);

  useEffect(() => {
    currentHealth.value = engine.healthRef.current.currentHealth;
    currentScore.value = engine.scoreRef.current.currentScore;
    totalDistance.value = engine.timeRef.current.totalDistance;

    return engine.onFrame(() => {
      currentHealth.value = engine.healthRef.current.currentHealth;
      currentScore.value = engine.scoreRef.current.currentScore;
      totalDistance.value = engine.timeRef.current.totalDistance;
    });
  }, [currentHealth, currentScore, engine, totalDistance]);

  return (
    <View style={hudStyles.root} pointerEvents="none">
      <ActiveEffectDurationHud />
      <View style={clusterStyle}>
        <View style={[hudStyles.row, hudStyles.heartsRow]}>
          {heartIndices.map((index) => (
            <HudHeart key={index} index={index} currentHealth={currentHealth} />
          ))}
        </View>

        <View style={hudStyles.metricBlock}>
          <Text style={hudStyles.metricLabel}>SCORE</Text>
          <HudNumberField sharedValue={currentScore} />
        </View>

        <View style={hudStyles.metricBlock}>
          <Text style={hudStyles.metricLabel}>DIST</Text>
          <HudNumberField sharedValue={totalDistance} suffix="m" />
        </View>
      </View>
    </View>
  );
});
