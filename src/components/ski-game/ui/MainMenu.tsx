import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SKI_GAME_COLORS } from '../utils/colors';

import { MENU_TEXT_PRIMARY } from './ScoringGuideTypes';

const ACTION_WIDTH = 280;
const ACTION_HEIGHT = 60;
const ACTION_RADIUS = 16;
const ACTION_GAP = 16;
const TITLE_TO_ACTIONS = 48;
const PLAY_LABEL_COLOR = '#FFFFFF';

/** Bundled copy of `/AVINTO/Ski/TYPOGRAPHY.png` (Metro cannot require outside the app root). */
const SNOW_DASH_LOGO = require('../../../../assets/TYPOGRAPHY.png') as number;

/** Source asset is 1460×803 — keep aspect while fitting the menu column. */
const LOGO_WIDTH = 300;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (803 / 1460));

const menuStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    maxWidth: 360,
    width: '100%',
  },
  logo: {
    width: LOGO_WIDTH,
    maxWidth: '100%',
    height: LOGO_HEIGHT,
    marginBottom: TITLE_TO_ACTIONS,
  },
  actions: {
    width: ACTION_WIDTH,
    maxWidth: '100%',
    gap: ACTION_GAP,
    alignItems: 'stretch',
  },
  /** Shared physical button chrome — Play and Quit must match size/radius. */
  actionButton: {
    height: ACTION_HEIGHT,
    width: '100%',
    borderRadius: ACTION_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playButton: {
    backgroundColor: SKI_GAME_COLORS.playerPlaceholderBorder,
    borderWidth: 0,
  },
  quitButton: {
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: SKI_GAME_COLORS.playerPlaceholderBorder,
  },
  playLabel: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: PLAY_LABEL_COLOR,
    textAlign: 'center',
  },
  quitLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: MENU_TEXT_PRIMARY,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.86,
  },
});

export type MainMenuPlayHandler = () => void;
export type MainMenuQuitHandler = () => void;

export type MainMenuProps = {
  onPlayGame: MainMenuPlayHandler;
  onQuitGame?: MainMenuQuitHandler;
};

/** Placeholder — intentionally no-op (no app exit). */
export const MAIN_MENU_PLACEHOLDER_QUIT = (): void => {
  // App exit / session teardown will plug in here.
};

export const MainMenu = memo(function MainMenu({
  onPlayGame,
  onQuitGame = MAIN_MENU_PLACEHOLDER_QUIT,
}: MainMenuProps) {
  const insets = useSafeAreaInsets();

  const handlePlayPress = useCallback(() => {
    onPlayGame();
  }, [onPlayGame]);

  const handleQuitPress = useCallback(() => {
    onQuitGame();
  }, [onQuitGame]);

  return (
    <View
      style={[
        menuStyles.root,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
      pointerEvents="auto"
    >
      <View style={menuStyles.content}>
        <Image
          source={SNOW_DASH_LOGO}
          style={menuStyles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Snow Dash"
        />
        <View style={menuStyles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play Game"
            onPress={handlePlayPress}
            style={({ pressed }) => [pressed ? menuStyles.buttonPressed : undefined]}
          >
            <View style={[menuStyles.actionButton, menuStyles.playButton]}>
              <Text style={menuStyles.playLabel}>PLAY GAME</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quit Game"
            onPress={handleQuitPress}
            style={({ pressed }) => [pressed ? menuStyles.buttonPressed : undefined]}
          >
            <View style={[menuStyles.actionButton, menuStyles.quitButton]}>
              <Text style={menuStyles.quitLabel}>QUIT GAME</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
});
