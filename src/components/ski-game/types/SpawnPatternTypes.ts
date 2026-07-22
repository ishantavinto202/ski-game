import type { ObstacleVariant } from './ObstacleTypes';

export type SpawnPatternDifficulty = 'easy' | 'medium' | 'hard';

export interface PatternObstacle {
  variant: ObstacleVariant;
  /** Lane index relative to the pattern center (−2 … 2). */
  laneOffset: number;
  /** World-space distance behind the pattern origin Y (subtracted from origin). */
  forwardOffset: number;
}

export interface SpawnPattern {
  id: string;
  weight: number;
  difficulty: SpawnPatternDifficulty;
  obstacles: readonly PatternObstacle[];
}
