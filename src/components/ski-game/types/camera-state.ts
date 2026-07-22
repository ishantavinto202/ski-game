export type CameraState = {
  /** Smoothed horizontal camera offset in pixels (positive = view shifted right). */
  offsetX: number;
};

export function createInitialCameraState(): CameraState {
  return {
    offsetX: 0,
  };
}
