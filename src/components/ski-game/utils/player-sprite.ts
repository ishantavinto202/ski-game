import playerAtlasMetadata from '../../../../assets/character sprite/texture.json';

/** Player skier texture (blue/red). */
export const PLAYER_ATLAS_TEXTURE =
  require('../../../../assets/character sprite/texture.png') as number;

/**
 * Chaser skier texture (purple/green recolor).
 * Same atlas dimensions/frame layout as the player sheet — reuse PLAYER_ATLAS geometry.
 */
export const CHASER_ATLAS_TEXTURE =
  require('../../../../assets/character sprite/texture_2.png') as number;

/** Source frame size from the skier atlas (all frames untrimmed). */
export const PLAYER_SPRITE_SOURCE_WIDTH = 304;
export const PLAYER_SPRITE_SOURCE_HEIGHT = 273;

type TexturePackerFrameEntry = {
  frame: { x: number; y: number; w: number; h: number };
  pivot: { x: number; y: number };
};

type TexturePackerAtlas = {
  frames: Record<string, TexturePackerFrameEntry>;
  meta: { size: { w: number; h: number } };
};

const playerAtlas = playerAtlasMetadata as TexturePackerAtlas;

/**
 * Precomputed atlas tables — numeric sort on frame names (`1.png` … `25.png`).
 * Built once at module load; never allocate during gameplay.
 * Shared by Player and Chaser (identical sheet geometry).
 */
function buildPlayerAtlasFrameTables(): {
  frameX: readonly number[];
  frameY: readonly number[];
  frameW: readonly number[];
  frameH: readonly number[];
  atlasWidth: number;
  atlasHeight: number;
  frameCount: number;
} {
  const frameKeys = Object.keys(playerAtlas.frames).sort((leftKey, rightKey) => {
    const leftNumber = Number.parseInt(leftKey, 10);
    const rightNumber = Number.parseInt(rightKey, 10);
    return leftNumber - rightNumber;
  });

  const frameX: number[] = [];
  const frameY: number[] = [];
  const frameW: number[] = [];
  const frameH: number[] = [];

  for (let index = 0; index < frameKeys.length; index += 1) {
    const entry = playerAtlas.frames[frameKeys[index]];
    frameX.push(entry.frame.x);
    frameY.push(entry.frame.y);
    frameW.push(entry.frame.w);
    frameH.push(entry.frame.h);
  }

  return {
    frameX,
    frameY,
    frameW,
    frameH,
    atlasWidth: playerAtlas.meta.size.w,
    atlasHeight: playerAtlas.meta.size.h,
    frameCount: frameKeys.length,
  };
}

/** Shared skier atlas frame geometry (player + chaser). */
export const PLAYER_ATLAS = buildPlayerAtlasFrameTables();
export const PLAYER_SPRITE_FRAME_COUNT = PLAYER_ATLAS.frameCount;
