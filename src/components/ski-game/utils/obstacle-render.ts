import type { ObstacleRecord } from '../types/ObstacleTypes';
import type { ViewportSize } from '../engine/GameEngine';
import { GAME_CONFIG } from './GameConfig';
import { worldYCenterToScreenY } from './world-coordinates';

export type ObstacleScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function obstacleWorldToScreenRect(
  obstacle: ObstacleRecord,
  scrollOffsetY: number,
  cameraOffsetX: number,
): ObstacleScreenRect {
  return {
    left: obstacle.worldX - obstacle.width * 0.5 - cameraOffsetX,
    top: worldYCenterToScreenY(scrollOffsetY, obstacle.worldY) - obstacle.height * 0.5,
    width: obstacle.width,
    height: obstacle.height,
  };
}

export function isObstacleRectVisible(
  rect: ObstacleScreenRect,
  viewport: ViewportSize,
  margin: number,
): boolean {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  if (right < -margin) {
    return false;
  }
  if (rect.left > viewport.width + margin) {
    return false;
  }
  if (bottom < -margin) {
    return false;
  }
  if (rect.top > viewport.height + margin) {
    return false;
  }

  return true;
}

export function getObstacleRenderMargin(): number {
  return GAME_CONFIG.OBSTACLE_RENDER_MARGIN;
}
