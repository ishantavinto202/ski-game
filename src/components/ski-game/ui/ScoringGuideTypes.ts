import type { ImageSourcePropType } from 'react-native';

export type ScoringGuideEffectTone = 'positive' | 'negative' | 'neutral';

/** Collectible/booster benefit chip tone — mirrors penalty chips with semantic color. */
export type GuideBenefitChipTone = 'positive' | 'shield' | 'boost';

export type GuideBenefitChip = {
  value: string;
  label: string;
  tone: GuideBenefitChipTone;
};

export type ScoringGuideAssetFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  atlasW: number;
  atlasH: number;
};

/** UI-only thumbnail layout — does not affect gameplay asset anchoring. */
export type GuideAssetLayout = {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
};

export type ScoringGuideItem = {
  id: string;
  category: 'collectible' | 'obstacle';
  title: string;
  description?: string;
  asset: ImageSourcePropType;
  assetFrame?: ScoringGuideAssetFrame;
  /** Optional object-centered PNG layout inside the preview box. */
  guideAssetLayout?: GuideAssetLayout;
  /** Legacy loose-text effects — unused when benefitChips or scorePenalty is set. */
  primaryEffect?: string;
  secondaryEffect?: string;
  /** Collectible/booster benefit chips (guide UI only). */
  benefitChips?: readonly GuideBenefitChip[];
  /** Obstacle score delta (e.g. -15). When set, row renders penalty chips instead of loose effect text. */
  scorePenalty?: number;
  /** Hearts removed on hit. Omitted when the obstacle does not damage health. */
  healthPenalty?: number;
  effectTone: ScoringGuideEffectTone;
};

export type ScoringGuideOverlayProps = {
  onClose: () => void;
};

/** Guide thumbnail container (UI-only; independent of gameplay footprints). */
export const SCORING_GUIDE_PREVIEW_SIZE = 52;

/** Shared horizontal inset for Pause / Game Over modal content. */
export const MENU_MODAL_HORIZONTAL_PADDING = 28;

export const SCORING_GUIDE_OVERLAY_Z_INDEX = 50;

/** Shared menu surface tokens aligned with Pause / Game Over. */
export const MENU_PANEL_BACKGROUND = 'rgba(255, 255, 255, 0.96)';
export const MENU_PANEL_BORDER = '#1D3557';
export const MENU_TEXT_PRIMARY = '#1D3557';
export const MENU_TEXT_SECONDARY = '#64748B';
export const MENU_BORDER_RADIUS = 12;
export const MENU_ROW_BACKGROUND = 'rgba(241, 245, 249, 0.92)';
export const MENU_ROW_BORDER = 'rgba(29, 53, 87, 0.18)';
export const MENU_SECTION_ACCENT = '#0E7490';
export const MENU_EFFECT_POSITIVE = '#15803D';
export const MENU_EFFECT_NEGATIVE = '#DC2626';
export const MENU_EFFECT_NEUTRAL = '#1D3557';
/** Shield guide chip — matches shield pickup / section accent. */
export const MENU_EFFECT_SHIELD = '#0E7490';
/** Speed Boost guide chip — matches speed-boost placeholder accent. */
export const MENU_EFFECT_BOOST = '#2563EB';
export const MENU_SCRIM = 'rgba(15, 23, 42, 0.42)';
