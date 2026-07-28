import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  formatGameplayFeedbackHealthLine,
  formatGameplayFeedbackScoreLine,
  getGameplayFeedbackPool,
  getGameplayFeedbackSlotIndices,
  GAMEPLAY_FEEDBACK_RISE_PX,
  tickGameplayFeedback,
} from '../effects/GameplayFeedback';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const FEEDBACK_SLOT_INDICES = getGameplayFeedbackSlotIndices();

const layerStyle = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    minWidth: 96,
    transform: [{ translateX: -48 }],
  },
  scoreLine: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  healthLine: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#E11D48',
    padding: 0,
    margin: 0,
    marginTop: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

type GameplayFeedbackSlotProps = {
  slotIndex: number;
};

const GameplayFeedbackSlot = memo(function GameplayFeedbackSlot({
  slotIndex,
}: GameplayFeedbackSlotProps) {
  const engine = useGameEngineContext();
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scoreDelta = useSharedValue(0);
  const healthDamage = useSharedValue(0);
  const scoreLineText = useSharedValue('');
  const healthLineText = useSharedValue('');

  const bubbleStyle = useMemo(() => layerStyle.bubble, []);
  const scoreLineStyle = useMemo(() => layerStyle.scoreLine, []);
  const healthLineStyle = useMemo(() => layerStyle.healthLine, []);

  useEffect(() => {
    return engine.onFrame(() => {
      const pool = getGameplayFeedbackPool(engine);
      const entry = pool.entries[slotIndex];

      if (!entry.active || entry.totalLifeMs <= 0) {
        if (opacity.value !== 0) {
          opacity.value = 0;
        }
        return;
      }

      const progress = entry.elapsedMs / entry.totalLifeMs;
      left.value = entry.screenX;
      top.value = entry.screenY - GAMEPLAY_FEEDBACK_RISE_PX * progress;
      opacity.value = progress >= 1 ? 0 : 1 - progress;
      scoreDelta.value = entry.scoreDelta;
      healthDamage.value = entry.healthDamage;
      scoreLineText.value = formatGameplayFeedbackScoreLine(entry.scoreDelta);
      healthLineText.value = formatGameplayFeedbackHealthLine(entry.healthDamage);
    });
  }, [
    engine,
    healthDamage,
    healthLineText,
    left,
    opacity,
    scoreDelta,
    scoreLineText,
    slotIndex,
    top,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    opacity: opacity.value,
  }));

  const scoreAnimatedProps = useAnimatedProps(() => ({
    text: scoreLineText.value,
    defaultValue: scoreLineText.value,
  }));

  const healthAnimatedProps = useAnimatedProps(() => ({
    text: healthLineText.value,
    defaultValue: healthLineText.value,
  }));

  const scoreToneStyle = useAnimatedStyle(() => ({
    color:
      scoreDelta.value >= 0
        ? SKI_GAME_COLORS.coinPlaceholderBorder
        : SKI_GAME_COLORS.playerPlaceholderBorder,
  }));

  const healthLineVisibilityStyle = useAnimatedStyle(() => ({
    opacity: healthDamage.value > 0 ? opacity.value : 0,
  }));

  return (
    <Animated.View style={[bubbleStyle, containerStyle]} pointerEvents="none">
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        underlineColorAndroid="transparent"
        style={[scoreLineStyle, scoreToneStyle]}
        animatedProps={scoreAnimatedProps}
      />
      <Animated.View style={healthLineVisibilityStyle}>
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          underlineColorAndroid="transparent"
          style={healthLineStyle}
          animatedProps={healthAnimatedProps}
        />
      </Animated.View>
    </Animated.View>
  );
});

type GameplayFeedbackRendererProps = {
  viewport: ViewportSize;
};

export const GameplayFeedbackRenderer = memo(function GameplayFeedbackRenderer({
  viewport: _viewport,
}: GameplayFeedbackRendererProps) {
  const engine = useGameEngineContext();
  const lastFrameMsRef = useRef(0);

  useEffect(() => {
    lastFrameMsRef.current = 0;

    return engine.onFrame(() => {
      const now = performance.now();
      const deltaMs = lastFrameMsRef.current > 0 ? now - lastFrameMsRef.current : 0;
      lastFrameMsRef.current = now;
      tickGameplayFeedback(engine, deltaMs);
    });
  }, [engine]);

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {FEEDBACK_SLOT_INDICES.map((slotIndex) => (
        <GameplayFeedbackSlot key={slotIndex} slotIndex={slotIndex} />
      ))}
    </View>
  );
});
