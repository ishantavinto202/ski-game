import { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestPauseGame } from '../entities/GameState';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';
import { writeSharedNumber } from '../utils/shared-value-write';

import {
  GAME_FLOW_STATE_INDEX,
  PAUSE_BUTTON_INSET,
  PAUSE_BUTTON_SIZE,
  PAUSE_FLOW_PLAYING,
} from './PauseTypes';

const pauseButtonStyles = StyleSheet.create({
  root: {
    position: 'absolute',
    zIndex: 20,
  },
  hit: {
    width: PAUSE_BUTTON_SIZE,
    height: PAUSE_BUTTON_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    lineHeight: 22,
  },
});

export const PauseButton = memo(function PauseButton() {
  const engine = useGameEngineContext();
  const insets = useSafeAreaInsets();
  const flowStateIndex = useSharedValue(GAME_FLOW_STATE_INDEX.ready);

  useEffect(() => {
    writeSharedNumber(
      flowStateIndex,
      GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState],
    );

    return engine.onFrame(() => {
      writeSharedNumber(
        flowStateIndex,
        GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState],
      );
    });
  }, [engine, flowStateIndex]);

  const handlePausePress = useCallback(() => {
    requestPauseGame(engine);
  }, [engine]);

  const containerStyle = useAnimatedStyle(() => ({
    display: flowStateIndex.value === PAUSE_FLOW_PLAYING ? 'flex' : 'none',
  }));

  const rootStyle = useMemo(
    () => [
      pauseButtonStyles.root,
      {
        top: insets.top + PAUSE_BUTTON_INSET,
        right: insets.right + PAUSE_BUTTON_INSET,
      },
      containerStyle,
    ],
    [containerStyle, insets.right, insets.top],
  );

  return (
    <Animated.View style={rootStyle} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pause game"
        onPress={handlePausePress}
        style={pauseButtonStyles.hit}
      >
        <Text style={pauseButtonStyles.label}>❚❚</Text>
      </Pressable>
    </Animated.View>
  );
});
