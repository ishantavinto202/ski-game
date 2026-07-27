/**
 * Cosmetic snow-surface detail assets (transparent PNGs).
 * Lighting is baked for east/right sun — do not flip or rotate.
 *
 * NOTE: `Snow Depression .png` has a space before `.png` — keep the filename exact.
 * `Snow Mound.png` exists on disk but is intentionally excluded (reads like an obstacle).
 */

export type SnowSurfaceAssetDef = {
  /** Stable id for debugging / docs. */
  id: string;
  source: number;
  nativeWidth: number;
  nativeHeight: number;
  /** Authoring display width before per-instance scale (px). Aspect preserved. */
  baseWidth: number;
  /** Relative spawn weight (large depression is intentionally rarest). */
  spawnWeight: number;
  /** Optional per-asset scale range; defaults to GameConfig SNOW_SURFACE_SCALE_*. */
  scaleMin?: number;
  scaleMax?: number;
};

export const SNOW_SURFACE_ASSETS: readonly SnowSurfaceAssetDef[] = [
  {
    id: 'depression',
    source: require('../../../../assets/bg asset/Snow Depression .png') as number,
    nativeWidth: 349,
    nativeHeight: 114,
    baseWidth: 112,
    spawnWeight: 3,
    scaleMin: 0.6,
    scaleMax: 0.72,
  },
  {
    id: 'depression-small',
    source: require('../../../../assets/bg asset/Snow Depression Small.png') as number,
    nativeWidth: 148,
    nativeHeight: 67,
    baseWidth: 56,
    spawnWeight: 28,
    scaleMin: 0.75,
    scaleMax: 1.0,
  },
  {
    id: 'dimples',
    source: require('../../../../assets/bg asset/Snow Dimples.png') as number,
    nativeWidth: 598,
    nativeHeight: 169,
    baseWidth: 148,
    spawnWeight: 30,
    scaleMin: 0.7,
    scaleMax: 0.95,
  },
  {
    id: 'ridge-short',
    source: require('../../../../assets/bg asset/Snow Ridge Short.png') as number,
    nativeWidth: 195,
    nativeHeight: 77,
    baseWidth: 72,
    spawnWeight: 27,
    scaleMin: 0.75,
    scaleMax: 1.0,
  },
  {
    id: 'ridge',
    source: require('../../../../assets/bg asset/Snow Ridge.png') as number,
    nativeWidth: 354,
    nativeHeight: 120,
    baseWidth: 118,
    spawnWeight: 12,
    scaleMin: 0.7,
    scaleMax: 0.9,
  },
] as const;

export const SNOW_SURFACE_ASSET_COUNT = SNOW_SURFACE_ASSETS.length;

/** Sum of spawnWeight across active assets (precomputed; no alloc at runtime). */
export const SNOW_SURFACE_SPAWN_WEIGHT_TOTAL = SNOW_SURFACE_ASSETS.reduce(
  (sum, asset) => sum + asset.spawnWeight,
  0,
);

export function resolveSnowSurfaceBaseHeight(asset: SnowSurfaceAssetDef): number {
  return asset.baseWidth * (asset.nativeHeight / asset.nativeWidth);
}
