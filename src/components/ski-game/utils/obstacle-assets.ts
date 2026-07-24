import type { ObstacleVariant } from '../types/ObstacleTypes';
import { OBSTACLE_VARIANT_DIMENSIONS } from '../types/ObstacleTypes';

export const cabinAsset = require('../../../../assets/obstacles/cabin.png') as number;
export const treeStumpAsset = require('../../../../assets/obstacles/Stump.png') as number;
export const largeBoulderAsset = require('../../../../assets/obstacles/Big Rock.png') as number;
export const smallRockAsset = require('../../../../assets/obstacles/Small Rock.png') as number;
export const woodenFenceAsset = require('../../../../assets/obstacles/Fence.png') as number;

export const treeVisualAssets = [
  require('../../../../assets/obstacles/Big Tree (Tree 1).png') as number,
  require('../../../../assets/obstacles/Medim Tree (Tree 2).png') as number,
  require('../../../../assets/obstacles/Small Tree (Tree 3).png') as number,
] as const;

/** Source PNG metadata — canvas vs physical object bounds (source px). Not used by collision. */
export type ObstacleAssetMetadata = {
  canvasWidth: number;
  canvasHeight: number;
  objectWidth: number;
  objectHeight: number;
  /** Physical object origin within the PNG canvas (source px). */
  objectOffsetX: number;
  objectOffsetY: number;
};

export type ObstacleVisualAsset = {
  source: number;
  metadata: ObstacleAssetMetadata;
  /** Physical hitbox within the object body (ratios 0..1, shadow excluded). */
  collision: ObstacleCollisionMetadata;
};

/** Hitbox within the rendered object body — not the PNG canvas and not cast shadows. */
export type ObstacleCollisionMetadata = {
  widthRatio: number;
  heightRatio: number;
  offsetXRatio: number;
  offsetYRatio: number;
};

export type ObstacleCollisionLayout = {
  /** Offset from gameplay rect top-left (px). */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

/**
 * Verified PNG canvas + opaque object-body bounds (shadow excluded via alpha/column analysis).
 * Supplied design notes differ from actual repo files — values below match the PNGs on disk.
 */
export const CABIN_ASSET_METADATA: ObstacleAssetMetadata = {
  canvasWidth: 536,
  canvasHeight: 610,
  objectWidth: 455,
  objectHeight: 610,
  objectOffsetX: 81,
  objectOffsetY: 0,
} as const;

export const TREE_STUMP_ASSET_METADATA: ObstacleAssetMetadata = {
  canvasWidth: 243,
  canvasHeight: 200,
  objectWidth: 209,
  objectHeight: 200,
  objectOffsetX: 33,
  objectOffsetY: 0,
} as const;

export const LARGE_BOULDER_ASSET_METADATA: ObstacleAssetMetadata = {
  canvasWidth: 432,
  canvasHeight: 325,
  objectWidth: 412,
  objectHeight: 292,
  objectOffsetX: 17,
  objectOffsetY: 2,
} as const;

export const SMALL_ROCK_ASSET_METADATA: ObstacleAssetMetadata = {
  canvasWidth: 122,
  canvasHeight: 113,
  objectWidth: 100,
  objectHeight: 110,
  objectOffsetX: 22,
  objectOffsetY: 0,
} as const;

export const WOODEN_FENCE_ASSET_METADATA: ObstacleAssetMetadata = {
  canvasWidth: 375,
  canvasHeight: 122,
  objectWidth: 344,
  objectHeight: 122,
  objectOffsetX: 30,
  objectOffsetY: 0,
} as const;

export const SMALL_ROCK_COLLISION: ObstacleCollisionMetadata = {
  widthRatio: 0.52,
  heightRatio: 0.42,
  offsetXRatio: 0.24,
  offsetYRatio: 0.1,
} as const;

export const LARGE_BOULDER_COLLISION: ObstacleCollisionMetadata = {
  widthRatio: 0.58,
  heightRatio: 0.48,
  offsetXRatio: 0.2,
  offsetYRatio: 0.14,
} as const;

export const TREE_STUMP_COLLISION: ObstacleCollisionMetadata = {
  widthRatio: 0.5,
  heightRatio: 0.45,
  offsetXRatio: 0.25,
  offsetYRatio: 0.4,
} as const;

export const CABIN_COLLISION: ObstacleCollisionMetadata = {
  widthRatio: 0.62,
  heightRatio: 0.5,
  offsetXRatio: 0.18,
  offsetYRatio: 0.42,
} as const;

export const WOODEN_FENCE_COLLISION: ObstacleCollisionMetadata = {
  widthRatio: 0.82,
  heightRatio: 0.4,
  offsetXRatio: 0.1,
  offsetYRatio: 0.45,
} as const;

export const TREE_VISUAL_COLLISIONS: readonly ObstacleCollisionMetadata[] = [
  { widthRatio: 0.38, heightRatio: 0.26, offsetXRatio: 0.31, offsetYRatio: 0.7 },
  { widthRatio: 0.4, heightRatio: 0.28, offsetXRatio: 0.32, offsetYRatio: 0.68 },
  { widthRatio: 0.42, heightRatio: 0.3, offsetXRatio: 0.28, offsetYRatio: 0.65 },
] as const;

export const TREE_VISUAL_ASSETS: readonly ObstacleVisualAsset[] = [
  {
    source: treeVisualAssets[0],
    metadata: {
      canvasWidth: 659,
      canvasHeight: 480,
      objectWidth: 327,
      objectHeight: 419,
      objectOffsetX: 322,
      objectOffsetY: 6,
    },
    collision: TREE_VISUAL_COLLISIONS[0],
  },
  {
    source: treeVisualAssets[1],
    metadata: {
      canvasWidth: 432,
      canvasHeight: 377,
      objectWidth: 176,
      objectHeight: 327,
      objectOffsetX: 251,
      objectOffsetY: 0,
    },
    collision: TREE_VISUAL_COLLISIONS[1],
  },
  {
    source: treeVisualAssets[2],
    metadata: {
      canvasWidth: 395,
      canvasHeight: 367,
      objectWidth: 215,
      objectHeight: 358,
      objectOffsetX: 176,
      objectOffsetY: 0,
    },
    collision: TREE_VISUAL_COLLISIONS[2],
  },
] as const;

export const TREE_VISUAL_VARIANT_COUNT = TREE_VISUAL_ASSETS.length;

export type ObstacleVariantAssetConfig =
  | { kind: 'single'; asset: ObstacleVisualAsset }
  | { kind: 'multi'; assets: readonly ObstacleVisualAsset[] };

export const OBSTACLE_VARIANT_ASSETS: Partial<Record<ObstacleVariant, ObstacleVariantAssetConfig>> =
  {
    small_rock: {
      kind: 'single',
      asset: {
        source: smallRockAsset,
        metadata: SMALL_ROCK_ASSET_METADATA,
        collision: SMALL_ROCK_COLLISION,
      },
    },
    large_boulder: {
      kind: 'single',
      asset: {
        source: largeBoulderAsset,
        metadata: LARGE_BOULDER_ASSET_METADATA,
        collision: LARGE_BOULDER_COLLISION,
      },
    },
    tree_stump: {
      kind: 'single',
      asset: {
        source: treeStumpAsset,
        metadata: TREE_STUMP_ASSET_METADATA,
        collision: TREE_STUMP_COLLISION,
      },
    },
    tree: {
      kind: 'multi',
      assets: TREE_VISUAL_ASSETS,
    },
    cabin: {
      kind: 'single',
      asset: {
        source: cabinAsset,
        metadata: CABIN_ASSET_METADATA,
        collision: CABIN_COLLISION,
      },
    },
    wooden_fence: {
      kind: 'single',
      asset: {
        source: woodenFenceAsset,
        metadata: WOODEN_FENCE_ASSET_METADATA,
        collision: WOODEN_FENCE_COLLISION,
      },
    },
  };

/** Flat render source table indexed by `resolveObstacleRenderAssetIndex`. */
export const OBSTACLE_RENDER_ASSET_SOURCES: readonly number[] = [
  TREE_VISUAL_ASSETS[0].source,
  TREE_VISUAL_ASSETS[1].source,
  TREE_VISUAL_ASSETS[2].source,
  cabinAsset,
  smallRockAsset,
  largeBoulderAsset,
  treeStumpAsset,
  woodenFenceAsset,
];

export const OBSTACLE_RENDER_ASSET_INDEX = {
  treeVisualBase: 0,
  cabin: 3,
  smallRock: 4,
  largeBoulder: 5,
  treeStump: 6,
  woodenFence: 7,
} as const;

export type ObstacleVisualLayout = {
  renderWidth: number;
  renderHeight: number;
  /** Screen offset from gameplay rect top-left (px). */
  visualOffsetX: number;
  visualOffsetY: number;
};

export function hasObstacleAsset(variant: ObstacleVariant): boolean {
  return OBSTACLE_VARIANT_ASSETS[variant] !== undefined;
}

export function resolveObstacleRenderAssetIndex(
  variant: ObstacleVariant,
  treeVisualVariant: number,
): number {
  if (variant === 'tree') {
    if (treeVisualVariant < 0 || treeVisualVariant >= TREE_VISUAL_VARIANT_COUNT) {
      return OBSTACLE_RENDER_ASSET_INDEX.treeVisualBase;
    }
    return OBSTACLE_RENDER_ASSET_INDEX.treeVisualBase + treeVisualVariant;
  }
  if (variant === 'cabin') {
    return OBSTACLE_RENDER_ASSET_INDEX.cabin;
  }
  if (variant === 'small_rock') {
    return OBSTACLE_RENDER_ASSET_INDEX.smallRock;
  }
  if (variant === 'large_boulder') {
    return OBSTACLE_RENDER_ASSET_INDEX.largeBoulder;
  }
  if (variant === 'tree_stump') {
    return OBSTACLE_RENDER_ASSET_INDEX.treeStump;
  }
  if (variant === 'wooden_fence') {
    return OBSTACLE_RENDER_ASSET_INDEX.woodenFence;
  }
  return -1;
}

function resolveVisualAssetLayout(
  asset: ObstacleVisualAsset,
  gameplayWidth: number,
  gameplayHeight: number,
): ObstacleVisualLayout {
  const { metadata } = asset;
  const scale = gameplayWidth / metadata.objectWidth;
  const renderWidth = metadata.canvasWidth * scale;
  const renderHeight = metadata.canvasHeight * scale;
  const objectBottomY = (metadata.objectOffsetY + metadata.objectHeight) * scale;

  return {
    renderWidth,
    renderHeight,
    visualOffsetX: -metadata.objectOffsetX * scale,
    visualOffsetY: gameplayHeight - objectBottomY,
  };
}

export function resolveObstacleAssetVisualLayout(
  variant: ObstacleVariant,
  treeVisualVariant: number,
  gameplayWidth: number,
  gameplayHeight: number,
): ObstacleVisualLayout | null {
  const config = OBSTACLE_VARIANT_ASSETS[variant];
  if (!config) {
    return null;
  }

  if (config.kind === 'single') {
    return resolveVisualAssetLayout(config.asset, gameplayWidth, gameplayHeight);
  }

  const visualIndex =
    treeVisualVariant < 0 || treeVisualVariant >= config.assets.length ? 0 : treeVisualVariant;
  return resolveVisualAssetLayout(config.assets[visualIndex], gameplayWidth, gameplayHeight);
}

function resolveCollisionLayoutFromAsset(
  asset: ObstacleVisualAsset,
  gameplayWidth: number,
  gameplayHeight: number,
): ObstacleCollisionLayout {
  const { metadata, collision } = asset;
  const scale = gameplayWidth / metadata.objectWidth;
  const objectBodyWidth = metadata.objectWidth * scale;
  const objectBodyHeight = metadata.objectHeight * scale;
  const objectBodyTop = gameplayHeight - objectBodyHeight;

  return {
    offsetX: collision.offsetXRatio * objectBodyWidth,
    offsetY: objectBodyTop + collision.offsetYRatio * objectBodyHeight,
    width: collision.widthRatio * objectBodyWidth,
    height: collision.heightRatio * objectBodyHeight,
  };
}

function precomputeVariantCollisionLayouts(
  variant: ObstacleVariant,
  gameplayWidth: number,
  gameplayHeight: number,
): ObstacleCollisionLayout[] {
  const config = OBSTACLE_VARIANT_ASSETS[variant];
  if (!config) {
    return [];
  }
  if (config.kind === 'single') {
    return [resolveCollisionLayoutFromAsset(config.asset, gameplayWidth, gameplayHeight)];
  }
  const layouts: ObstacleCollisionLayout[] = [];
  for (let index = 0; index < config.assets.length; index += 1) {
    layouts.push(
      resolveCollisionLayoutFromAsset(config.assets[index], gameplayWidth, gameplayHeight),
    );
  }
  return layouts;
}

function precomputeVariantLayouts(
  variant: ObstacleVariant,
  gameplayWidth: number,
  gameplayHeight: number,
): ObstacleVisualLayout[] {
  const config = OBSTACLE_VARIANT_ASSETS[variant];
  if (!config) {
    return [];
  }
  if (config.kind === 'single') {
    return [resolveVisualAssetLayout(config.asset, gameplayWidth, gameplayHeight)];
  }
  const layouts: ObstacleVisualLayout[] = [];
  for (let index = 0; index < config.assets.length; index += 1) {
    layouts.push(resolveVisualAssetLayout(config.assets[index], gameplayWidth, gameplayHeight));
  }
  return layouts;
}

/** Precomputed layouts at scaled gameplay footprints (no per-frame alloc). */
export const SMALL_ROCK_VISUAL_LAYOUT: ObstacleVisualLayout = precomputeVariantLayouts(
  'small_rock',
  OBSTACLE_VARIANT_DIMENSIONS.small_rock.width,
  OBSTACLE_VARIANT_DIMENSIONS.small_rock.height,
)[0];

export const LARGE_BOULDER_VISUAL_LAYOUT: ObstacleVisualLayout = precomputeVariantLayouts(
  'large_boulder',
  OBSTACLE_VARIANT_DIMENSIONS.large_boulder.width,
  OBSTACLE_VARIANT_DIMENSIONS.large_boulder.height,
)[0];

export const TREE_STUMP_VISUAL_LAYOUT: ObstacleVisualLayout = precomputeVariantLayouts(
  'tree_stump',
  OBSTACLE_VARIANT_DIMENSIONS.tree_stump.width,
  OBSTACLE_VARIANT_DIMENSIONS.tree_stump.height,
)[0];

export const CABIN_VISUAL_LAYOUT: ObstacleVisualLayout = precomputeVariantLayouts(
  'cabin',
  OBSTACLE_VARIANT_DIMENSIONS.cabin.width,
  OBSTACLE_VARIANT_DIMENSIONS.cabin.height,
)[0];

export const WOODEN_FENCE_VISUAL_LAYOUT: ObstacleVisualLayout = precomputeVariantLayouts(
  'wooden_fence',
  OBSTACLE_VARIANT_DIMENSIONS.wooden_fence.width,
  OBSTACLE_VARIANT_DIMENSIONS.wooden_fence.height,
)[0];

export const TREE_VISUAL_LAYOUTS: readonly ObstacleVisualLayout[] = precomputeVariantLayouts(
  'tree',
  OBSTACLE_VARIANT_DIMENSIONS.tree.width,
  OBSTACLE_VARIANT_DIMENSIONS.tree.height,
);

export const SMALL_ROCK_COLLISION_LAYOUT: ObstacleCollisionLayout =
  precomputeVariantCollisionLayouts(
    'small_rock',
    OBSTACLE_VARIANT_DIMENSIONS.small_rock.width,
    OBSTACLE_VARIANT_DIMENSIONS.small_rock.height,
  )[0];

export const LARGE_BOULDER_COLLISION_LAYOUT: ObstacleCollisionLayout =
  precomputeVariantCollisionLayouts(
    'large_boulder',
    OBSTACLE_VARIANT_DIMENSIONS.large_boulder.width,
    OBSTACLE_VARIANT_DIMENSIONS.large_boulder.height,
  )[0];

export const TREE_STUMP_COLLISION_LAYOUT: ObstacleCollisionLayout =
  precomputeVariantCollisionLayouts(
    'tree_stump',
    OBSTACLE_VARIANT_DIMENSIONS.tree_stump.width,
    OBSTACLE_VARIANT_DIMENSIONS.tree_stump.height,
  )[0];

export const CABIN_COLLISION_LAYOUT: ObstacleCollisionLayout = precomputeVariantCollisionLayouts(
  'cabin',
  OBSTACLE_VARIANT_DIMENSIONS.cabin.width,
  OBSTACLE_VARIANT_DIMENSIONS.cabin.height,
)[0];

export const WOODEN_FENCE_COLLISION_LAYOUT: ObstacleCollisionLayout =
  precomputeVariantCollisionLayouts(
    'wooden_fence',
    OBSTACLE_VARIANT_DIMENSIONS.wooden_fence.width,
    OBSTACLE_VARIANT_DIMENSIONS.wooden_fence.height,
  )[0];

export const TREE_COLLISION_LAYOUTS: readonly ObstacleCollisionLayout[] =
  precomputeVariantCollisionLayouts(
    'tree',
    OBSTACLE_VARIANT_DIMENSIONS.tree.width,
    OBSTACLE_VARIANT_DIMENSIONS.tree.height,
  );

export function resolvePrecomputedObstacleCollisionLayout(
  variant: ObstacleVariant,
  treeVisualVariant: number,
): ObstacleCollisionLayout | null {
  if (variant === 'small_rock') {
    return SMALL_ROCK_COLLISION_LAYOUT;
  }
  if (variant === 'large_boulder') {
    return LARGE_BOULDER_COLLISION_LAYOUT;
  }
  if (variant === 'tree_stump') {
    return TREE_STUMP_COLLISION_LAYOUT;
  }
  if (variant === 'cabin') {
    return CABIN_COLLISION_LAYOUT;
  }
  if (variant === 'wooden_fence') {
    return WOODEN_FENCE_COLLISION_LAYOUT;
  }
  if (variant === 'tree') {
    const index =
      treeVisualVariant < 0 || treeVisualVariant >= TREE_COLLISION_LAYOUTS.length
        ? 0
        : treeVisualVariant;
    return TREE_COLLISION_LAYOUTS[index];
  }
  return null;
}

export function resolvePrecomputedObstacleVisualLayout(
  variant: ObstacleVariant,
  treeVisualVariant: number,
): ObstacleVisualLayout | null {
  if (variant === 'small_rock') {
    return SMALL_ROCK_VISUAL_LAYOUT;
  }
  if (variant === 'large_boulder') {
    return LARGE_BOULDER_VISUAL_LAYOUT;
  }
  if (variant === 'tree_stump') {
    return TREE_STUMP_VISUAL_LAYOUT;
  }
  if (variant === 'cabin') {
    return CABIN_VISUAL_LAYOUT;
  }
  if (variant === 'wooden_fence') {
    return WOODEN_FENCE_VISUAL_LAYOUT;
  }
  if (variant === 'tree') {
    const index =
      treeVisualVariant < 0 || treeVisualVariant >= TREE_VISUAL_LAYOUTS.length
        ? 0
        : treeVisualVariant;
    return TREE_VISUAL_LAYOUTS[index];
  }
  return null;
}
