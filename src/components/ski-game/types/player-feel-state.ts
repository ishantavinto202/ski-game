export type PlayerFeelState = {
  /** Current lean in degrees (negative = left, positive = right). */
  leanAngle: number;
};

export function createInitialPlayerFeelState(): PlayerFeelState {
  return {
    leanAngle: 0,
  };
}
