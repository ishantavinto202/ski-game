export type TimeState = {
  elapsedMs: number;
  deltaMs: number;
  totalDistance: number;
  /** Fixed timestep accumulator mirrored from GameLoop (ms). */
  fixedAccumulatorMs: number;
};

export function createInitialTimeState(): TimeState {
  return {
    elapsedMs: 0,
    deltaMs: 0,
    totalDistance: 0,
    fixedAccumulatorMs: 0,
  };
}
