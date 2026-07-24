import type { ObstacleRecord } from '../types/ObstacleTypes';
import { resolvePrecomputedObstacleCollisionLayout } from './obstacle-assets';
import { obstacleWorldToScreenRect, type ObstacleScreenRect } from './obstacle-render';

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
  const gameplayRect = obstacleWorldToScreenRect(obstacle, scrollOffsetY, cameraOffsetX);
  const layout = resolvePrecomputedObstacleCollisionLayout(
    obstacle.variant,
    obstacle.treeVisualVariant,
  );

  if (!layout) {
    collisionScreenScratch.left = gameplayRect.left;
    collisionScreenScratch.top = gameplayRect.top;
    collisionScreenScratch.width = gameplayRect.width;
    collisionScreenScratch.height = gameplayRect.height;
    return collisionScreenScratch;
  }

  collisionScreenScratch.left = gameplayRect.left + layout.offsetX;
  collisionScreenScratch.top = gameplayRect.top + layout.offsetY;
  collisionScreenScratch.width = layout.width;
  collisionScreenScratch.height = layout.height;
  return collisionScreenScratch;
}
