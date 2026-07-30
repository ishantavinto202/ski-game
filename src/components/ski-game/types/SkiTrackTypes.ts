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
  /** Incremented only when the point ring changes; render geometry sync keys off this. */
  layoutRevision: number;
  /** Segment layouts rebuilt only when `layoutRevision` changes (allocation-free). */
  activeSegmentCount: number;
  segLeftCenterX: Float64Array;
  segLeftCenterY: Float64Array;
  segRightCenterX: Float64Array;
  segRightCenterY: Float64Array;
  segLength: Float64Array;
  segAngleDeg: Float64Array;
  segOpacity: Float64Array;
};
