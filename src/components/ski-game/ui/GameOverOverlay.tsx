import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { playAgain } from '../systems/RestartSystem';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { writeSharedNumber } from '../utils/shared-value-write';

import { GAME_FLOW_STATE_INDEX } from './PauseTypes';
import {
  GAME_FLOW_GAME_OVER,
  GAME_OVER_OVERLAY_Z_INDEX,
  GAME_OVER_PLACEHOLDER_QUIT,
  readGameOverSummaryFromRefs,
  type GameOverOverlayProps,
} from './GameOverTypes';
import { ScoringGuideOverlay } from './ScoringGuideOverlay';
import { MENU_MODAL_HORIZONTAL_PADDING } from './ScoringGuideTypes';

const MENU_BUTTON_GAP = 14;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  panel: {
    minWidth: 260,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: MENU_MODAL_HORIZONTAL_PADDING,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    marginBottom: 4,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    textAlign: 'center',
    alignSelf: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    minWidth: 72,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    padding: 0,
    margin: 0,
    minWidth: 80,
  },
  buttonStack: {
    marginTop: 8,
    width: '100%',
    gap: MENU_BUTTON_GAP,
    alignItems: 'stretch',
  },
  action: {
    minWidth: 180,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    backgroundColor: SKI_GAME_COLORS.snow,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
  },
  secondaryAction: {
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
  },
});
const secondaryActionStyle = [
  overlayStyles.action,
  overlayStyles.secondaryAction,
];

type GameOverStatFieldProps = {
  sharedValue: SharedValue<number>;
  suffix?: string;
  style?: TextStyle;
};

const GameOverStatField = memo(function GameOverStatField({
  sharedValue,
  suffix = '',
  style,
}: GameOverStatFieldProps) {
  const animatedProps = useAnimatedProps(() => {
    const value = Math.floor(sharedValue.value);
    const text = suffix.length > 0 ? `${value}${suffix}` : `${value}`;
    return {
      text,
      defaultValue: text,
    };
  });
  const compositeStyle = useMemo(
    () => [overlayStyles.statValue, style],
    [style],
  );

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      style={compositeStyle}
      animatedProps={animatedProps}
    />
  );
});

export const GameOverOverlay = memo(function GameOverOverlay({
  onPlayAgainPress,
  onQuitPress = GAME_OVER_PLACEHOLDER_QUIT,
}: GameOverOverlayProps) {
  const engine = useGameEngineContext();
  const flowStateIndex = useSharedValue(GAME_FLOW_STATE_INDEX.ready);
  const currentScore = useSharedValue<number>(0);
  const totalDistance = useSharedValue<number>(0);
  const totalCoins = useSharedValue<number>(0);
  const previousFlowStateIndexRef = useRef<number | null>(null);

  const rootStyle = useMemo(
    () => [overlayStyles.root, { zIndex: GAME_OVER_OVERLAY_Z_INDEX }],
    [],
  );

  useEffect(() => {
    const sync = () => {
      const nextFlowStateIndex =
        GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState];
      writeSharedNumber(flowStateIndex, nextFlowStateIndex);

      if (
        nextFlowStateIndex !== GAME_FLOW_GAME_OVER ||
        previousFlowStateIndexRef.current === GAME_FLOW_GAME_OVER
      ) {
        previousFlowStateIndexRef.current = nextFlowStateIndex;
        return;
      }

      const summary = readGameOverSummaryFromRefs({
        scoreRef: engine.scoreRef,
        timeRef: engine.timeRef,
        coinRef: engine.coinRef,
        healthRef: engine.healthRef,
      });
      writeSharedNumber(currentScore, summary.currentScore);
      writeSharedNumber(totalDistance, summary.totalDistance);
      writeSharedNumber(totalCoins, summary.totalCoinsCollected);
      previousFlowStateIndexRef.current = nextFlowStateIndex;
    };

    sync();
    return engine.onFrame(sync);
  }, [currentScore, engine, flowStateIndex, totalCoins, totalDistance]);

  const containerStyle = useAnimatedStyle(() => ({
    display: flowStateIndex.value === GAME_FLOW_GAME_OVER ? 'flex' : 'none',
  }));
  const rootCompositeStyle = useMemo(
    () => [rootStyle, containerStyle],
    [containerStyle, rootStyle],
  );

  const handlePlayAgainPress = useCallback(() => {
    if (onPlayAgainPress) {
      onPlayAgainPress();
      return;
    }
    playAgain(engine);
  }, [engine, onPlayAgainPress]);

  const handleQuitPress = useCallback(() => {
    onQuitPress();
  }, [onQuitPress]);

  const [isScoringGuideOpen, setIsScoringGuideOpen] = useState(false);
  const handleOpenScoringGuide = useCallback(() => {
    setIsScoringGuideOpen(true);
  }, []);
  const handleCloseScoringGuide = useCallback(() => {
    setIsScoringGuideOpen(false);
  }, []);

  return (
    <Animated.View style={rootCompositeStyle} pointerEvents="auto">
      <View style={overlayStyles.scrim} pointerEvents="none" />
      <View style={overlayStyles.panel}>
        <Text style={overlayStyles.title}>GAME OVER</Text>
        <View style={overlayStyles.statRow}>
          <Text style={overlayStyles.statLabel}>Score</Text>
          <GameOverStatField sharedValue={currentScore} />
        </View>
        <View style={overlayStyles.statRow}>
          <Text style={overlayStyles.statLabel}>Distance</Text>
          <GameOverStatField sharedValue={totalDistance} suffix="m" />
        </View>
        <View style={overlayStyles.statRow}>
          <Text style={overlayStyles.statLabel}>Coins</Text>
          <GameOverStatField sharedValue={totalCoins} />
        </View>
        <View style={overlayStyles.buttonStack}>
          <Pressable accessibilityRole="button" onPress={handlePlayAgainPress} style={overlayStyles.action}>
            <Text style={overlayStyles.actionLabel}>Play Again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenScoringGuide}
            style={overlayStyles.action}
          >
            <Text style={overlayStyles.actionLabel}>Scoring Guide</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleQuitPress}
            style={secondaryActionStyle}
          >
            <Text style={overlayStyles.actionLabel}>Quit</Text>
          </Pressable>
        </View>
      </View>
      {isScoringGuideOpen ? <ScoringGuideOverlay onClose={handleCloseScoringGuide} /> : null}
    </Animated.View>
  );
});
