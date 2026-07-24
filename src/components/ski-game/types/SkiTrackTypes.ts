export type SkiTrackPoint = {
  x: number;
  y: number;
};

export type SkiTrackState = {
  points: SkiTrackPoint[];
  /** Index of the oldest active point in `points`. */
  start: number;
  count: number;
  lastSampleWorldX: number;
  lastSampleWorldY: number;
  hasLastSample: boolean;
  /** Segment layouts rebuilt each frame for render sync (allocation-free). */
  activeSegmentCount: number;
  segLeftCenterX: Float64Array;
  segLeftCenterY: Float64Array;
  segRightCenterX: Float64Array;
  segRightCenterY: Float64Array;
  segLength: Float64Array;
  segAngleDeg: Float64Array;
  segOpacity: Float64Array;
};
