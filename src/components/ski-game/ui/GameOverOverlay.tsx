import { memo, useCallback, useEffect, useMemo } from 'react';
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

import { GAME_FLOW_STATE_INDEX } from './PauseTypes';
import {
  GAME_FLOW_GAME_OVER,
  GAME_OVER_OVERLAY_Z_INDEX,
  GAME_OVER_PLACEHOLDER_QUIT,
  readGameOverSummaryFromRefs,
  type GameOverOverlayProps,
} from './GameOverTypes';

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
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    marginBottom: 4,
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
  actions: {
    marginTop: 8,
    gap: 10,
    width: '100%',
    alignItems: 'center',
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

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      style={[overlayStyles.statValue, style]}
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
  const totalDistance = useSharedValue<number>(0);
  const totalCoins = useSharedValue<number>(0);

  const rootStyle = useMemo(
    () => [overlayStyles.root, { zIndex: GAME_OVER_OVERLAY_Z_INDEX }],
    [],
  );

  useEffect(() => {
    const sync = () => {
      flowStateIndex.value = GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState];
      const summary = readGameOverSummaryFromRefs({
        timeRef: engine.timeRef,
        coinRef: engine.coinRef,
        healthRef: engine.healthRef,
      });
      totalDistance.value = summary.totalDistance;
      totalCoins.value = summary.totalCoinsCollected;
    };

    sync();
    return engine.onFrame(sync);
  }, [engine, flowStateIndex, totalCoins, totalDistance]);

  const containerStyle = useAnimatedStyle(() => ({
    display: flowStateIndex.value === GAME_FLOW_GAME_OVER ? 'flex' : 'none',
  }));

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

  return (
    <Animated.View style={[rootStyle, containerStyle]} pointerEvents="auto">
      <View style={overlayStyles.scrim} pointerEvents="none" />
      <View style={overlayStyles.panel}>
        <Text style={overlayStyles.title}>GAME OVER</Text>
        <View style={overlayStyles.statRow}>
          <Text style={overlayStyles.statLabel}>Distance</Text>
          <GameOverStatField sharedValue={totalDistance} suffix="m" />
        </View>
        <View style={overlayStyles.statRow}>
          <Text style={overlayStyles.statLabel}>Coins</Text>
          <GameOverStatField sharedValue={totalCoins} />
        </View>
        <View style={overlayStyles.actions}>
          <Pressable accessibilityRole="button" onPress={handlePlayAgainPress} style={overlayStyles.action}>
            <Text style={overlayStyles.actionLabel}>Play Again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleQuitPress}
            style={[overlayStyles.action, overlayStyles.secondaryAction]}
          >
            <Text style={overlayStyles.actionLabel}>Quit</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});
