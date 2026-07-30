import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

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
import { writeSharedNumber } from '../utils/shared-value-write';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const FEEDBACK_SLOT_INDICES = getGameplayFeedbackSlotIndices();
const FEEDBACK_SLOT_COUNT = FEEDBACK_SLOT_INDICES.length;

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

type FeedbackSlotShared = {
  left: SharedValue<number>;
  top: SharedValue<number>;
  opacity: SharedValue<number>;
  scoreDelta: SharedValue<number>;
  healthDamage: SharedValue<number>;
  scoreLineText: SharedValue<string>;
  healthLineText: SharedValue<string>;
};

function createFeedbackSlotShared(): FeedbackSlotShared {
  return {
    left: makeMutable(0),
    top: makeMutable(0),
    opacity: makeMutable(0),
    scoreDelta: makeMutable(0),
    healthDamage: makeMutable(0),
    scoreLineText: makeMutable(''),
    healthLineText: makeMutable(''),
  };
}

type GameplayFeedbackSlotProps = {
  shared: FeedbackSlotShared;
};

const GameplayFeedbackSlot = memo(function GameplayFeedbackSlot({
  shared,
}: GameplayFeedbackSlotProps) {
  const bubbleStyle = useMemo(() => layerStyle.bubble, []);
  const scoreLineStyle = useMemo(() => layerStyle.scoreLine, []);
  const healthLineStyle = useMemo(() => layerStyle.healthLine, []);

  const containerStyle = useAnimatedStyle(() => ({
    left: shared.left.value,
    top: shared.top.value,
    opacity: shared.opacity.value,
  }));

  const scoreAnimatedProps = useAnimatedProps(() => ({
    text: shared.scoreLineText.value,
    defaultValue: shared.scoreLineText.value,
  }));

  const healthAnimatedProps = useAnimatedProps(() => ({
    text: shared.healthLineText.value,
    defaultValue: shared.healthLineText.value,
  }));

  const scoreToneStyle = useAnimatedStyle(() => ({
    color:
      shared.scoreDelta.value >= 0
        ? SKI_GAME_COLORS.coinPlaceholderBorder
        : SKI_GAME_COLORS.playerPlaceholderBorder,
  }));

  const healthLineVisibilityStyle = useAnimatedStyle(() => ({
    opacity: shared.healthDamage.value > 0 ? shared.opacity.value : 0,
  }));
  const bubbleCompositeStyle = useMemo(
    () => [bubbleStyle, containerStyle],
    [bubbleStyle, containerStyle],
  );
  const scoreCompositeStyle = useMemo(
    () => [scoreLineStyle, scoreToneStyle],
    [scoreLineStyle, scoreToneStyle],
  );

  return (
    <Animated.View style={bubbleCompositeStyle} pointerEvents="none">
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        underlineColorAndroid="transparent"
        style={scoreCompositeStyle}
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

  const slots = useMemo(() => {
    const list: FeedbackSlotShared[] = new Array(FEEDBACK_SLOT_COUNT);
    for (let index = 0; index < FEEDBACK_SLOT_COUNT; index += 1) {
      list[index] = createFeedbackSlotShared();
    }
    return list;
  }, []);

  useEffect(() => {
    lastFrameMsRef.current = 0;

    return engine.onPlayingFrame(() => {
      const now = performance.now();
      const deltaMs = lastFrameMsRef.current > 0 ? now - lastFrameMsRef.current : 0;
      lastFrameMsRef.current = now;
      tickGameplayFeedback(engine, deltaMs);

      const pool = getGameplayFeedbackPool(engine);

      for (let slotIndex = 0; slotIndex < FEEDBACK_SLOT_COUNT; slotIndex += 1) {
        const slot = slots[slotIndex];
        const entry = pool.entries[slotIndex];

        if (!entry.active || entry.totalLifeMs <= 0) {
          writeSharedNumber(slot.opacity, 0);
          continue;
        }

        const progress = entry.elapsedMs / entry.totalLifeMs;
        writeSharedNumber(slot.left, entry.screenX);
        writeSharedNumber(slot.top, entry.screenY - GAMEPLAY_FEEDBACK_RISE_PX * progress);
        writeSharedNumber(slot.opacity, progress >= 1 ? 0 : 1 - progress);
        writeSharedNumber(slot.scoreDelta, entry.scoreDelta);
        writeSharedNumber(slot.healthDamage, entry.healthDamage);

        const scoreText = formatGameplayFeedbackScoreLine(entry.scoreDelta);
        if (slot.scoreLineText.value !== scoreText) {
          slot.scoreLineText.value = scoreText;
        }
        const healthText = formatGameplayFeedbackHealthLine(entry.healthDamage);
        if (slot.healthLineText.value !== healthText) {
          slot.healthLineText.value = healthText;
        }
      }
    });
  }, [engine, slots]);

  const renderSlot = useCallback(
    (slotIndex: number) => (
      <GameplayFeedbackSlot key={slotIndex} shared={slots[slotIndex]} />
    ),
    [slots],
  );
  const slotElements = useMemo(
    () => FEEDBACK_SLOT_INDICES.map(renderSlot),
    [renderSlot],
  );

  return (
    <View style={layerStyle.root} pointerEvents="none">
      {slotElements}
    </View>
  );
});
