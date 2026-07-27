import type { ImageSourcePropType } from 'react-native';

import {
  CABIN_ASSET_METADATA,
  LARGE_BOULDER_ASSET_METADATA,
  SMALL_ROCK_ASSET_METADATA,
  TREE_STUMP_ASSET_METADATA,
  TREE_VISUAL_ASSETS,
  WOODEN_FENCE_ASSET_METADATA,
  cabinAsset,
  largeBoulderAsset,
  smallRockAsset,
  treeStumpAsset,
  woodenFenceAsset,
  type ObstacleAssetMetadata,
} from '../utils/obstacle-assets';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  COIN_COLLECT_SCORE,
  OBSTACLE_CONSEQUENCES,
  type ObstacleConsequence,
} from '../utils/score-consequences';

import type { GuideAssetLayout, ScoringGuideItem } from './ScoringGuideTypes';
import { SCORING_GUIDE_PREVIEW_SIZE } from './ScoringGuideTypes';

/** Representative tree visual for the guide (all tree PNGs share one gameplay entry). */
const treeGuideAsset = TREE_VISUAL_ASSETS[0].source;
const treeGuideMetadata = TREE_VISUAL_ASSETS[0].metadata;

/** Scoring Guide thumbnails only — gameplay pickup atlases stay on their renderers. */
const COIN_GUIDE_ASSET = require('../../../../assets/voxel assets/Coin.png') as number;
const SHIELD_GUIDE_ASSET = require('../../../../assets/voxel assets/Sheld Guide.png') as number;
const SPEED_BOOST_GUIDE_ASSET =
  require('../../../../assets/voxel assets/Blue_Thunder_Asset.png') as number;

function formatScoreDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

function formatDurationValue(durationMs: number): string {
  return `${Math.round(durationMs / 1000)}`;
}

function formatSpeedMultiplier(multiplier: number): string {
  const text = Number.isInteger(multiplier)
    ? `${multiplier}`
    : multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}×`;
}

function formatObstacleEffects(consequence: ObstacleConsequence): {
  primaryEffect: string;
  secondaryEffect?: string;
  scorePenalty: number;
  healthPenalty?: number;
  effectTone: 'negative';
} {
  const scoreText = formatScoreDelta(consequence.scoreDelta);
  if (consequence.healthDamage > 0) {
    return {
      primaryEffect: scoreText,
      secondaryEffect: `♥ -${consequence.healthDamage}`,
      scorePenalty: consequence.scoreDelta,
      healthPenalty: consequence.healthDamage,
      effectTone: 'negative',
    };
  }
  return {
    primaryEffect: scoreText,
    secondaryEffect: 'SCORE',
    scorePenalty: consequence.scoreDelta,
    effectTone: 'negative',
  };
}

/**
 * Centers the opaque object body inside the guide preview box.
 * Presentation-only — does not alter gameplay layouts.
 */
function createGuideObjectLayout(
  metadata: ObstacleAssetMetadata,
  targetObjectMax: number,
): GuideAssetLayout {
  const scale = Math.min(
    targetObjectMax / metadata.objectWidth,
    targetObjectMax / metadata.objectHeight,
  );
  const objectCenterX = (metadata.objectOffsetX + metadata.objectWidth / 2) * scale;
  const objectCenterY = (metadata.objectOffsetY + metadata.objectHeight / 2) * scale;

  return {
    width: metadata.canvasWidth * scale,
    height: metadata.canvasHeight * scale,
    offsetX: SCORING_GUIDE_PREVIEW_SIZE / 2 - objectCenterX,
    offsetY: SCORING_GUIDE_PREVIEW_SIZE / 2 - objectCenterY,
  };
}

const shieldDurationValue = formatDurationValue(GAME_CONFIG.SHIELD_DURATION_MS);
const boostDurationValue = formatDurationValue(GAME_CONFIG.SPEED_BOOST_DURATION_MS);
const boostMultiplierLabel = formatSpeedMultiplier(GAME_CONFIG.SPEED_BOOST_MULTIPLIER);

export const COLLECTIBLE_GUIDE_ITEMS: readonly ScoringGuideItem[] = [
  {
    id: 'coin',
    category: 'collectible',
    title: 'Coin',
    description: 'Collect for score',
    asset: COIN_GUIDE_ASSET as ImageSourcePropType,
    benefitChips: [
      {
        value: formatScoreDelta(COIN_COLLECT_SCORE),
        label: 'SCORE',
        tone: 'positive',
      },
    ],
    effectTone: 'positive',
  },
  {
    id: 'shield',
    category: 'collectible',
    title: 'Shield',
    description: 'Protects from one hit',
    asset: SHIELD_GUIDE_ASSET as ImageSourcePropType,
    benefitChips: [
      { value: '1', label: 'HIT', tone: 'shield' },
      { value: shieldDurationValue, label: 'SEC', tone: 'shield' },
    ],
    effectTone: 'neutral',
  },
  {
    id: 'speed_boost',
    category: 'collectible',
    title: 'Speed Boost',
    description: 'Temporary speed boost',
    asset: SPEED_BOOST_GUIDE_ASSET as ImageSourcePropType,
    benefitChips: [
      { value: boostMultiplierLabel, label: 'SPEED', tone: 'boost' },
      { value: boostDurationValue, label: 'SEC', tone: 'boost' },
    ],
    effectTone: 'positive',
  },
];

const smallRockEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.small_rock);
const largeBoulderEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.large_boulder);
const treeEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.tree);
const treeStumpEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.tree_stump);
const cabinEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.cabin);
const woodenFenceEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.wooden_fence);

export const OBSTACLE_GUIDE_ITEMS: readonly ScoringGuideItem[] = [
  {
    id: 'small_rock',
    category: 'obstacle',
    title: 'Small Rock',
    asset: smallRockAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(SMALL_ROCK_ASSET_METADATA, 44),
    primaryEffect: smallRockEffects.primaryEffect,
    secondaryEffect: smallRockEffects.secondaryEffect,
    scorePenalty: smallRockEffects.scorePenalty,
    healthPenalty: smallRockEffects.healthPenalty,
    effectTone: smallRockEffects.effectTone,
  },
  {
    id: 'large_boulder',
    category: 'obstacle',
    title: 'Large Boulder',
    asset: largeBoulderAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(LARGE_BOULDER_ASSET_METADATA, 46),
    primaryEffect: largeBoulderEffects.primaryEffect,
    secondaryEffect: largeBoulderEffects.secondaryEffect,
    scorePenalty: largeBoulderEffects.scorePenalty,
    healthPenalty: largeBoulderEffects.healthPenalty,
    effectTone: largeBoulderEffects.effectTone,
  },
  {
    id: 'tree',
    category: 'obstacle',
    title: 'Tree',
    asset: treeGuideAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(treeGuideMetadata, 46),
    primaryEffect: treeEffects.primaryEffect,
    secondaryEffect: treeEffects.secondaryEffect,
    scorePenalty: treeEffects.scorePenalty,
    healthPenalty: treeEffects.healthPenalty,
    effectTone: treeEffects.effectTone,
  },
  {
    id: 'tree_stump',
    category: 'obstacle',
    title: 'Tree Stump',
    asset: treeStumpAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(TREE_STUMP_ASSET_METADATA, 42),
    primaryEffect: treeStumpEffects.primaryEffect,
    secondaryEffect: treeStumpEffects.secondaryEffect,
    scorePenalty: treeStumpEffects.scorePenalty,
    healthPenalty: treeStumpEffects.healthPenalty,
    effectTone: treeStumpEffects.effectTone,
  },
  {
    id: 'cabin',
    category: 'obstacle',
    title: 'Cabin',
    asset: cabinAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(CABIN_ASSET_METADATA, 48),
    primaryEffect: cabinEffects.primaryEffect,
    secondaryEffect: cabinEffects.secondaryEffect,
    scorePenalty: cabinEffects.scorePenalty,
    healthPenalty: cabinEffects.healthPenalty,
    effectTone: cabinEffects.effectTone,
  },
  {
    id: 'wooden_fence',
    category: 'obstacle',
    title: 'Wooden Fence',
    asset: woodenFenceAsset as ImageSourcePropType,
    guideAssetLayout: createGuideObjectLayout(WOODEN_FENCE_ASSET_METADATA, 50),
    primaryEffect: woodenFenceEffects.primaryEffect,
    secondaryEffect: woodenFenceEffects.secondaryEffect,
    scorePenalty: woodenFenceEffects.scorePenalty,
    healthPenalty: woodenFenceEffects.healthPenalty,
    effectTone: woodenFenceEffects.effectTone,
  },
];

export const SCORING_GUIDE_ITEM_COUNT =
  COLLECTIBLE_GUIDE_ITEMS.length + OBSTACLE_GUIDE_ITEMS.length;
