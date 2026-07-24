import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ScoringGuideItem } from './ScoringGuideTypes';
import { SCORING_GUIDE_PREVIEW_SIZE } from './ScoringGuideTypes';

const EFFECT_COLOR = {
  positive: '#4ADE80',
  negative: '#F87171',
  neutral: '#E2E8F0',
} as const;

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
  },
  previewBox: {
    width: SCORING_GUIDE_PREVIEW_SIZE,
    height: SCORING_GUIDE_PREVIEW_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClip: {
    width: SCORING_GUIDE_PREVIEW_SIZE,
    height: SCORING_GUIDE_PREVIEW_SIZE,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  effects: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 72,
    gap: 2,
  },
  primaryEffect: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryEffect: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

type ScoringGuideRowProps = {
  item: ScoringGuideItem;
  isLastInSection: boolean;
};

export const ScoringGuideRow = memo(function ScoringGuideRow({
  item,
  isLastInSection,
}: ScoringGuideRowProps) {
  const effectColor = EFFECT_COLOR[item.effectTone];

  const preview = useMemo(() => {
    if (item.assetFrame) {
      const { x, y, w, h, atlasW, atlasH } = item.assetFrame;
      const scale = Math.min(SCORING_GUIDE_PREVIEW_SIZE / w, SCORING_GUIDE_PREVIEW_SIZE / h);
      const displayW = w * scale;
      const displayH = h * scale;
      return (
        <View style={rowStyles.previewClip}>
          <Image
            source={item.asset}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              width: atlasW * scale,
              height: atlasH * scale,
              left: -x * scale + (SCORING_GUIDE_PREVIEW_SIZE - displayW) / 2,
              top: -y * scale + (SCORING_GUIDE_PREVIEW_SIZE - displayH) / 2,
            }}
          />
        </View>
      );
    }

    return (
      <Image
        source={item.asset}
        resizeMode="contain"
        style={{ width: SCORING_GUIDE_PREVIEW_SIZE, height: SCORING_GUIDE_PREVIEW_SIZE }}
      />
    );
  }, [item]);

  return (
    <View style={[rowStyles.card, !isLastInSection ? { marginBottom: 8 } : null]}>
      <View style={rowStyles.previewBox}>{preview}</View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={rowStyles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={rowStyles.effects}>
        <Text style={[rowStyles.primaryEffect, { color: effectColor }]}>{item.primaryEffect}</Text>
        {item.secondaryEffect ? (
          <Text style={[rowStyles.secondaryEffect, { color: effectColor }]}>
            {item.secondaryEffect}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
