export type DecorativeTreeRecord = {
  worldX: number;
  worldY: number;
  width: number;
  height: number;
  active: boolean;
};

export type DecorativeTreePoolState = {
  trees: DecorativeTreeRecord[];
  activeCount: number;
  /** Next world Y (upstream) for continuous edge-tree placement. */
  nextEdgeTreeWorldY: number;
  edgeTreeFillInitialized: boolean;
  edgeTreeRngState: number;
  /** Trees left to place in the current edge cluster (0 = start a new cluster). */
  edgeTreesLeftInCluster: number;
};
