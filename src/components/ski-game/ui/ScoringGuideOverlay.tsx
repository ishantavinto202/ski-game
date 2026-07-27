import { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLLECTIBLE_GUIDE_ITEMS, OBSTACLE_GUIDE_ITEMS } from './scoring-guide-data';
import { ScoringGuideRow } from './ScoringGuideRow';
import type { ScoringGuideOverlayProps } from './ScoringGuideTypes';
import {
  MENU_BORDER_RADIUS,
  MENU_PANEL_BACKGROUND,
  MENU_PANEL_BORDER,
  MENU_SCRIM,
  MENU_SECTION_ACCENT,
  MENU_TEXT_PRIMARY,
  SCORING_GUIDE_OVERLAY_Z_INDEX,
} from './ScoringGuideTypes';

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: SCORING_GUIDE_OVERLAY_Z_INDEX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MENU_SCRIM,
  },
  panel: {
    width: '100%',
    borderRadius: MENU_BORDER_RADIUS,
    borderWidth: 2,
    borderColor: MENU_PANEL_BORDER,
    backgroundColor: MENU_PANEL_BACKGROUND,
    overflow: 'hidden',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(29, 53, 87, 0.22)',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    color: MENU_TEXT_PRIMARY,
    paddingHorizontal: 40,
  },
  closeHit: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: MENU_TEXT_PRIMARY,
    lineHeight: 24,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 4,
  },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MENU_SECTION_ACCENT,
  },
  obstaclesSectionLabel: {
    marginTop: 10,
  },
});

export const ScoringGuideOverlay = memo(function ScoringGuideOverlay({
  onClose,
}: ScoringGuideOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panelMaxHeight = viewportHeight * 0.8;
  const headerHeight = 60;

  const panelStyle = useMemo(
    () => [
      overlayStyles.panel,
      {
        width: viewportWidth * 0.9,
        maxHeight: panelMaxHeight,
      },
    ],
    [panelMaxHeight, viewportWidth],
  );

  const scrollStyle = useMemo(
    () => [overlayStyles.scroll, { maxHeight: panelMaxHeight - headerHeight }],
    [panelMaxHeight],
  );

  const scrollContentStyle = useMemo(
    () => [overlayStyles.scrollContent, { paddingBottom: Math.max(insets.bottom, 12) + 16 }],
    [insets.bottom],
  );

  return (
    <View style={overlayStyles.root} pointerEvents="auto">
      <View style={overlayStyles.scrim} pointerEvents="none" />
      <View style={panelStyle}>
        <View style={overlayStyles.header}>
          <Text style={overlayStyles.title}>SCORING GUIDE</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scoring guide"
            hitSlop={8}
            onPress={handleClose}
            style={overlayStyles.closeHit}
          >
            <Text style={overlayStyles.closeLabel}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          style={scrollStyle}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator
          bounces
        >
          <Text style={overlayStyles.sectionLabel}>COLLECTIBLES & BOOSTERS</Text>
          {COLLECTIBLE_GUIDE_ITEMS.map((item, index) => (
            <ScoringGuideRow
              key={item.id}
              item={item}
              isLastInSection={index === COLLECTIBLE_GUIDE_ITEMS.length - 1}
            />
          ))}
          <Text style={[overlayStyles.sectionLabel, overlayStyles.obstaclesSectionLabel]}>
            OBSTACLES
          </Text>
          {OBSTACLE_GUIDE_ITEMS.map((item, index) => (
            <ScoringGuideRow
              key={item.id}
              item={item}
              isLastInSection={index === OBSTACLE_GUIDE_ITEMS.length - 1}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
});
