import type { ObstacleVariant } from './ObstacleTypes';

export type CollisionState = {
  hasCollision: boolean;
  obstacleId: number;
  obstacleType: ObstacleVariant | null;
};

export function createInitialCollisionState(): CollisionState {
  return {
    hasCollision: false,
    obstacleId: 0,
    obstacleType: null,
  };
}

export function resetCollisionState(state: CollisionState): void {
  state.hasCollision = false;
  state.obstacleId = 0;
  state.obstacleType = null;
}
