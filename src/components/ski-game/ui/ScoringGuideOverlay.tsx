import { memo, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLLECTIBLE_GUIDE_ITEMS, OBSTACLE_GUIDE_ITEMS } from './scoring-guide-data';
import { ScoringGuideRow } from './ScoringGuideRow';
import type { ScoringGuideOverlayProps } from './ScoringGuideTypes';
import { SCORING_GUIDE_OVERLAY_Z_INDEX } from './ScoringGuideTypes';

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: SCORING_GUIDE_OVERLAY_Z_INDEX,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  panel: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#F8FAFC',
    paddingHorizontal: 44,
  },
  closeHit: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E2E8F0',
    lineHeight: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 8,
  },
  sectionLabel: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#7DD3FC',
  },
});

export const ScoringGuideOverlay = memo(function ScoringGuideOverlay({
  onClose,
}: ScoringGuideOverlayProps) {
  const insets = useSafeAreaInsets();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panelStyle = useMemo(
    () => [
      overlayStyles.panel,
      {
        marginTop: Math.max(insets.top, 12) + 8,
        marginBottom: Math.max(insets.bottom, 12) + 8,
      },
    ],
    [insets.bottom, insets.top],
  );

  const scrollContentStyle = useMemo(
    () => [overlayStyles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }],
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
            hitSlop={10}
            onPress={handleClose}
            style={overlayStyles.closeHit}
          >
            <Text style={overlayStyles.closeLabel}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          style={overlayStyles.scroll}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator
        >
          <Text style={overlayStyles.sectionLabel}>COLLECTIBLES & BOOSTERS</Text>
          {COLLECTIBLE_GUIDE_ITEMS.map((item, index) => (
            <ScoringGuideRow
              key={item.id}
              item={item}
              isLastInSection={index === COLLECTIBLE_GUIDE_ITEMS.length - 1}
            />
          ))}
          <Text style={overlayStyles.sectionLabel}>OBSTACLES</Text>
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
