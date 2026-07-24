import type { ImageSourcePropType } from 'react-native';

export type ScoringGuideEffectTone = 'positive' | 'negative' | 'neutral';

export type ScoringGuideAssetFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  atlasW: number;
  atlasH: number;
};

export type ScoringGuideItem = {
  id: string;
  category: 'collectible' | 'obstacle';
  title: string;
  description: string;
  asset: ImageSourcePropType;
  assetFrame?: ScoringGuideAssetFrame;
  primaryEffect: string;
  secondaryEffect?: string;
  effectTone: ScoringGuideEffectTone;
};

export type ScoringGuideOverlayProps = {
  onClose: () => void;
};

export type ScoringGuideInfoButtonProps = {
  onPress: () => void;
};

export const SCORING_GUIDE_PREVIEW_SIZE = 70;
export const SCORING_GUIDE_OVERLAY_Z_INDEX = 50;
export const SCORING_GUIDE_INFO_BUTTON_SIZE = 44;
