export type MovementState = {
  velocityX: number;
};

export function createInitialMovementState(): MovementState {
  return {
    velocityX: 0,
  };
}
