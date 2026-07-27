import { memo, useMemo, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type {
  GuideBenefitChip,
  GuideBenefitChipTone,
  ScoringGuideItem,
} from './ScoringGuideTypes';
import {
  MENU_EFFECT_BOOST,
  MENU_EFFECT_NEGATIVE,
  MENU_EFFECT_POSITIVE,
  MENU_EFFECT_SHIELD,
  MENU_ROW_BACKGROUND,
  MENU_ROW_BORDER,
  MENU_TEXT_PRIMARY,
  MENU_TEXT_SECONDARY,
  SCORING_GUIDE_PREVIEW_SIZE,
} from './ScoringGuideTypes';

type ChipTone = GuideBenefitChipTone | 'negative';

const CHIP_TONE = {
  positive: {
    background: 'rgba(21, 128, 61, 0.08)',
    border: 'rgba(21, 128, 61, 0.22)',
    foreground: MENU_EFFECT_POSITIVE,
  },
  shield: {
    background: 'rgba(14, 116, 144, 0.08)',
    border: 'rgba(14, 116, 144, 0.22)',
    foreground: MENU_EFFECT_SHIELD,
  },
  boost: {
    background: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.22)',
    foreground: MENU_EFFECT_BOOST,
  },
  negative: {
    background: 'rgba(220, 38, 38, 0.08)',
    border: 'rgba(220, 38, 38, 0.22)',
    foreground: MENU_EFFECT_NEGATIVE,
  },
} as const;

const BENEFIT_COLUMN_WIDTH = {
  coin: 108,
  shield: 80,
  speed_boost: 112,
} as const;

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MENU_ROW_BORDER,
    backgroundColor: MENU_ROW_BACKGROUND,
    marginBottom: 8,
    minHeight: 76,
  },
  cardLast: {
    marginBottom: 0,
  },
  previewBox: {
    width: SCORING_GUIDE_PREVIEW_SIZE,
    height: SCORING_GUIDE_PREVIEW_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
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
    fontSize: 17,
    fontWeight: '800',
    color: MENU_TEXT_PRIMARY,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: MENU_TEXT_SECONDARY,
  },
  chipColumn: {
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  healthHeart: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
});

type ScoringGuideRowProps = {
  item: ScoringGuideItem;
  isLastInSection: boolean;
};

type GuideStatChipProps = {
  tone: ChipTone;
  value: string;
  label?: string;
  leading?: ReactNode;
};

const GuideStatChip = memo(function GuideStatChip({
  tone,
  value,
  label,
  leading,
}: GuideStatChipProps) {
  const colors = CHIP_TONE[tone];
  return (
    <View
      style={[
        rowStyles.chip,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      {leading}
      <Text style={[rowStyles.chipValue, { color: colors.foreground }]}>{value}</Text>
      {label ? (
        <Text style={[rowStyles.chipLabel, { color: colors.foreground }]}>{label}</Text>
      ) : null}
    </View>
  );
});

type PenaltyChipsProps = {
  scorePenalty: number;
  healthPenalty?: number;
};

function formatPenaltyScore(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

const PenaltyChips = memo(function PenaltyChips({
  scorePenalty,
  healthPenalty,
}: PenaltyChipsProps) {
  return (
    <View style={[rowStyles.chipColumn, { width: 108 }]}>
      <GuideStatChip
        tone="negative"
        value={formatPenaltyScore(scorePenalty)}
        label="SCORE"
      />
      {healthPenalty !== undefined ? (
        <GuideStatChip
          tone="negative"
          value={`-${healthPenalty}`}
          leading={
            <Text style={[rowStyles.healthHeart, { color: MENU_EFFECT_NEGATIVE }]}>♥</Text>
          }
        />
      ) : null}
    </View>
  );
});

type BenefitChipsProps = {
  chips: readonly GuideBenefitChip[];
  itemId: string;
};

const BenefitChips = memo(function BenefitChips({ chips, itemId }: BenefitChipsProps) {
  const width =
    itemId === 'coin' || itemId === 'shield' || itemId === 'speed_boost'
      ? BENEFIT_COLUMN_WIDTH[itemId]
      : 108;

  return (
    <View style={[rowStyles.chipColumn, { width }]}>
      {chips.map((chip) => (
        <GuideStatChip
          key={`${chip.value}-${chip.label}`}
          tone={chip.tone}
          value={chip.value}
          label={chip.label}
        />
      ))}
    </View>
  );
});

export const ScoringGuideRow = memo(function ScoringGuideRow({
  item,
  isLastInSection,
}: ScoringGuideRowProps) {
  const preview = useMemo(() => {
    if (item.assetFrame) {
      const { x, y, w, h, atlasW, atlasH } = item.assetFrame;
      const displaySize = SCORING_GUIDE_PREVIEW_SIZE - 6;
      const scale = Math.min(displaySize / w, displaySize / h);
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

    if (item.guideAssetLayout) {
      const { width, height, offsetX = 0, offsetY = 0 } = item.guideAssetLayout;
      return (
        <View style={rowStyles.previewClip}>
          <Image
            source={item.asset}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              width,
              height,
              left: offsetX,
              top: offsetY,
            }}
          />
        </View>
      );
    }

    return (
      <Image
        source={item.asset}
        resizeMode="contain"
        style={{ width: SCORING_GUIDE_PREVIEW_SIZE - 6, height: SCORING_GUIDE_PREVIEW_SIZE - 6 }}
      />
    );
  }, [item]);

  let effects: ReactNode = null;
  if (item.scorePenalty !== undefined) {
    effects = (
      <PenaltyChips scorePenalty={item.scorePenalty} healthPenalty={item.healthPenalty} />
    );
  } else if (item.benefitChips && item.benefitChips.length > 0) {
    effects = <BenefitChips chips={item.benefitChips} itemId={item.id} />;
  }

  return (
    <View style={[rowStyles.card, isLastInSection ? rowStyles.cardLast : null]}>
      <View style={rowStyles.previewBox}>{preview}</View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={rowStyles.description} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {effects}
    </View>
  );
});
