export type WorldState = {
  /** Cumulative downward scroll in world space (pixels). */
  scrollOffsetY: number;
};

export function createInitialWorldState(): WorldState {
  return {
    scrollOffsetY: 0,
  };
}
