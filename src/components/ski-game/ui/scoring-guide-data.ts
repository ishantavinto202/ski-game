import type { ImageSourcePropType } from 'react-native';

import {
  cabinAsset,
  largeBoulderAsset,
  smallRockAsset,
  treeStumpAsset,
  treeVisualAssets,
  woodenFenceAsset,
} from '../utils/obstacle-assets';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  COIN_COLLECT_SCORE,
  OBSTACLE_CONSEQUENCES,
  type ObstacleConsequence,
} from '../utils/score-consequences';

import type { ScoringGuideItem } from './ScoringGuideTypes';

const COIN_ATLAS = require('../../../../assets/assets/Coin Animations/texture.png') as number;
const SHIELD_ATLAS =
  require('../../../../assets/assets/Shield Animations/shield-sprite.png') as number;
const SPEED_BOOST_ATLAS =
  require('../../../../assets/assets/Thunder Animations/speed-boost-sprite.png') as number;

function formatScoreDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

function formatDurationSec(durationMs: number): string {
  const seconds = Math.round(durationMs / 1000);
  return `${seconds} SEC`;
}

function formatSpeedMultiplier(multiplier: number): string {
  const text = Number.isInteger(multiplier)
    ? `${multiplier}`
    : multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}× SPEED`;
}

function formatObstacleEffects(consequence: ObstacleConsequence): {
  primaryEffect: string;
  secondaryEffect?: string;
  effectTone: 'negative';
} {
  const scoreText = formatScoreDelta(consequence.scoreDelta);
  if (consequence.healthDamage > 0) {
    return {
      primaryEffect: scoreText,
      secondaryEffect: `♥ -${consequence.healthDamage}`,
      effectTone: 'negative',
    };
  }
  return {
    primaryEffect: scoreText,
    secondaryEffect: 'SCORE',
    effectTone: 'negative',
  };
}

const shieldDurationLabel = formatDurationSec(GAME_CONFIG.SHIELD_DURATION_MS);
const boostDurationLabel = formatDurationSec(GAME_CONFIG.SPEED_BOOST_DURATION_MS);
const boostMultiplierLabel = formatSpeedMultiplier(GAME_CONFIG.SPEED_BOOST_MULTIPLIER);

export const COLLECTIBLE_GUIDE_ITEMS: readonly ScoringGuideItem[] = [
  {
    id: 'coin',
    category: 'collectible',
    title: 'Coin',
    description: 'Collect for score',
    asset: COIN_ATLAS as ImageSourcePropType,
    assetFrame: { x: 0, y: 248, w: 259, h: 248, atlasW: 1036, atlasH: 1240 },
    primaryEffect: formatScoreDelta(COIN_COLLECT_SCORE),
    secondaryEffect: 'SCORE',
    effectTone: 'positive',
  },
  {
    id: 'shield',
    category: 'collectible',
    title: 'Shield',
    description: 'Protects you from a hit',
    asset: SHIELD_ATLAS as ImageSourcePropType,
    assetFrame: { x: 179, y: 0, w: 179, h: 196, atlasW: 895, atlasH: 980 },
    primaryEffect: 'BLOCKS 1 HIT',
    secondaryEffect: shieldDurationLabel,
    effectTone: 'neutral',
  },
  {
    id: 'speed_boost',
    category: 'collectible',
    title: 'Speed Boost',
    description: 'Temporary downhill speed boost',
    asset: SPEED_BOOST_ATLAS as ImageSourcePropType,
    assetFrame: { x: 174, y: 0, w: 174, h: 258, atlasW: 1044, atlasH: 1032 },
    primaryEffect: boostMultiplierLabel,
    secondaryEffect: boostDurationLabel,
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
    description: 'Small snow-covered hazard',
    asset: smallRockAsset as ImageSourcePropType,
    primaryEffect: smallRockEffects.primaryEffect,
    secondaryEffect: smallRockEffects.secondaryEffect,
    effectTone: smallRockEffects.effectTone,
  },
  {
    id: 'large_boulder',
    category: 'obstacle',
    title: 'Large Boulder',
    description: 'Large mountain obstacle',
    asset: largeBoulderAsset as ImageSourcePropType,
    primaryEffect: largeBoulderEffects.primaryEffect,
    secondaryEffect: largeBoulderEffects.secondaryEffect,
    effectTone: largeBoulderEffects.effectTone,
  },
  {
    id: 'tree',
    category: 'obstacle',
    title: 'Tree',
    description: 'Avoid the alpine trees',
    asset: treeVisualAssets[0] as ImageSourcePropType,
    primaryEffect: treeEffects.primaryEffect,
    secondaryEffect: treeEffects.secondaryEffect,
    effectTone: treeEffects.effectTone,
  },
  {
    id: 'tree_stump',
    category: 'obstacle',
    title: 'Tree Stump',
    description: 'Low snow-covered obstacle',
    asset: treeStumpAsset as ImageSourcePropType,
    primaryEffect: treeStumpEffects.primaryEffect,
    secondaryEffect: treeStumpEffects.secondaryEffect,
    effectTone: treeStumpEffects.effectTone,
  },
  {
    id: 'cabin',
    category: 'obstacle',
    title: 'Cabin',
    description: 'Large mountain obstacle',
    asset: cabinAsset as ImageSourcePropType,
    primaryEffect: cabinEffects.primaryEffect,
    secondaryEffect: cabinEffects.secondaryEffect,
    effectTone: cabinEffects.effectTone,
  },
  {
    id: 'wooden_fence',
    category: 'obstacle',
    title: 'Wooden Fence',
    description: 'Blocks part of your route',
    asset: woodenFenceAsset as ImageSourcePropType,
    primaryEffect: woodenFenceEffects.primaryEffect,
    secondaryEffect: woodenFenceEffects.secondaryEffect,
    effectTone: woodenFenceEffects.effectTone,
  },
];

export const SCORING_GUIDE_ITEM_COUNT =
  COLLECTIBLE_GUIDE_ITEMS.length + OBSTACLE_GUIDE_ITEMS.length;
