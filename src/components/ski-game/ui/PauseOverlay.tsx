import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { requestResumeGame } from '../entities/GameState';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { SKI_GAME_COLORS } from '../utils/colors';

import {
  GAME_FLOW_STATE_INDEX,
  PAUSE_FLOW_PAUSED,
  PAUSE_OVERLAY_SCRIM_OPACITY,
  PAUSE_PLACEHOLDER_QUIT,
  type PauseOverlayProps,
} from './PauseTypes';
import { ScoringGuideOverlay } from './ScoringGuideOverlay';
import { MENU_MODAL_HORIZONTAL_PADDING } from './ScoringGuideTypes';

const PAUSE_BUTTON_GAP = 14;

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `rgba(15, 23, 42, ${PAUSE_OVERLAY_SCRIM_OPACITY})`,
  },
  panel: {
    minWidth: 220,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: MENU_MODAL_HORIZONTAL_PADDING,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
  },
  title: {
    marginBottom: 28,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    textAlign: 'center',
    alignSelf: 'center',
  },
  buttonStack: {
    width: '100%',
    gap: PAUSE_BUTTON_GAP,
    alignItems: 'stretch',
  },
  action: {
    minWidth: 160,
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
  quitAction: {
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
  },
});

export const PauseOverlay = memo(function PauseOverlay({ onQuitPress = PAUSE_PLACEHOLDER_QUIT }: PauseOverlayProps) {
  const engine = useGameEngineContext();
  const flowStateIndex = useSharedValue(GAME_FLOW_STATE_INDEX.ready);

  useEffect(() => {
    flowStateIndex.value = GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState];

    return engine.onFrame(() => {
      flowStateIndex.value = GAME_FLOW_STATE_INDEX[engine.gameStateRef.current.currentState];
    });
  }, [engine, flowStateIndex]);

  const handleResumePress = useCallback(() => {
    requestResumeGame(engine);
  }, [engine]);

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

  const containerStyle = useAnimatedStyle(() => ({
    display: flowStateIndex.value === PAUSE_FLOW_PAUSED ? 'flex' : 'none',
  }));

  return (
    <Animated.View style={[overlayStyles.root, containerStyle]} pointerEvents="auto">
      <View style={overlayStyles.scrim} pointerEvents="none" />
      <View style={overlayStyles.panel}>
        <Text style={overlayStyles.title}>PAUSED</Text>
        <View style={overlayStyles.buttonStack}>
          <Pressable accessibilityRole="button" onPress={handleResumePress} style={overlayStyles.action}>
            <Text style={overlayStyles.actionLabel}>Resume</Text>
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
            style={[overlayStyles.action, overlayStyles.quitAction]}
          >
            <Text style={overlayStyles.actionLabel}>Quit</Text>
          </Pressable>
        </View>
      </View>
      {isScoringGuideOpen ? <ScoringGuideOverlay onClose={handleCloseScoringGuide} /> : null}
    </Animated.View>
  );
});
