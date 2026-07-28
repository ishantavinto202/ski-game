import type { ObstacleRecord } from '../types/ObstacleTypes';
import { resolvePrecomputedObstacleCollisionLayout } from './obstacle-assets';
import type { ObstacleScreenRect } from './obstacle-render';
import { worldYCenterToScreenY } from './world-coordinates';

const collisionScreenScratch: ObstacleScreenRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

/**
 * Physical obstacle hitbox in screen space — excludes PNG canvas padding and cast shadows.
 * Reuses a module scratch rect; valid only until the next call.
 */
export function getObstacleCollisionScreenRect(
  obstacle: ObstacleRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): ObstacleScreenRect {
  const gameplayLeft = obstacle.worldX - obstacle.width * 0.5 - cameraOffsetX;
  const gameplayTop =
    worldYCenterToScreenY(scrollOffsetY, obstacle.worldY) - obstacle.height * 0.5;
  const layout = resolvePrecomputedObstacleCollisionLayout(
    obstacle.variant,
    obstacle.treeVisualVariant,
  );

  if (!layout) {
    collisionScreenScratch.left = gameplayLeft;
    collisionScreenScratch.top = gameplayTop;
    collisionScreenScratch.width = obstacle.width;
    collisionScreenScratch.height = obstacle.height;
    return collisionScreenScratch;
  }

  collisionScreenScratch.left = gameplayLeft + layout.offsetX;
  collisionScreenScratch.top = gameplayTop + layout.offsetY;
  collisionScreenScratch.width = layout.width;
  collisionScreenScratch.height = layout.height;
  return collisionScreenScratch;
}
