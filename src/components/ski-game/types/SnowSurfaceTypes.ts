export type SnowSurfaceTypeIndex = 0 | 1 | 2 | 3 | 4;

export type SnowSurfaceRecord = {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  typeIndex: SnowSurfaceTypeIndex;
  active: boolean;
};

export type SnowSurfacePoolState = {
  details: SnowSurfaceRecord[];
  activeCount: number;
  /** Next world Y (upstream) for irregular placement. */
  nextWorldY: number;
  fillInitialized: boolean;
  rngState: number;
};
