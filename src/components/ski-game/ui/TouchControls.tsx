import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  leftZone: {
    left: 0,
  },
  rightZone: {
    right: 0,
  },
});

const STEER_DIVIDER = GAME_CONFIG.STEER_ZONE_DIVIDER_X;
const LEFT_ZONE_WIDTH = `${STEER_DIVIDER * 100}%` as const;
const RIGHT_ZONE_WIDTH = `${(1 - STEER_DIVIDER) * 100}%` as const;

const leftZoneLayoutStyle = [overlayStyles.zone, overlayStyles.leftZone, { width: LEFT_ZONE_WIDTH }];
const rightZoneLayoutStyle = [overlayStyles.zone, overlayStyles.rightZone, { width: RIGHT_ZONE_WIDTH }];

export const TouchControls = memo(function TouchControls() {
  const engine = useGameEngineContext();

  const inputActions = useMemo(() => engine.inputActionsRef, [engine]);

  const handleLeftPressIn = useCallback(() => {
    inputActions.current?.setLeftPressed(true);
  }, [inputActions]);

  const handleLeftPressOut = useCallback(() => {
    inputActions.current?.setLeftPressed(false);
  }, [inputActions]);

  const handleRightPressIn = useCallback(() => {
    inputActions.current?.setRightPressed(true);
  }, [inputActions]);

  const handleRightPressOut = useCallback(() => {
    inputActions.current?.setRightPressed(false);
  }, [inputActions]);

  return (
    <View style={overlayStyles.root} pointerEvents="box-none">
      <Pressable
        style={leftZoneLayoutStyle}
        accessibilityRole="button"
        accessibilityLabel="Steer left"
        onPressIn={handleLeftPressIn}
        onPressOut={handleLeftPressOut}
      />
      <Pressable
        style={rightZoneLayoutStyle}
        accessibilityRole="button"
        accessibilityLabel="Steer right"
        onPressIn={handleRightPressIn}
        onPressOut={handleRightPressOut}
      />
    </View>
  );
});
