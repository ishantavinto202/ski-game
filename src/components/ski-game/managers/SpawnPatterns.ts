import type { SpawnPattern, SpawnPatternDifficulty } from '../types/SpawnPatternTypes';

export const CABIN_AVOIDANCE_PATTERN: SpawnPattern = {
  id: 'cabin_avoidance',
  weight: 5,
  difficulty: 'hard',
  obstacles: [
    { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
    { variant: 'cabin', laneOffset: 0, forwardOffset: 80 },
    { variant: 'tree', laneOffset: 1, forwardOffset: 200 },
  ],
};

export const CABIN_FLANK_WEAVE_PATTERN: SpawnPattern = {
  id: 'cabin_flank_weave',
  weight: 4,
  difficulty: 'hard',
  obstacles: [
    { variant: 'tree_stump', laneOffset: -2, forwardOffset: 0 },
    { variant: 'cabin', laneOffset: 1, forwardOffset: 60 },
    { variant: 'small_rock', laneOffset: -1, forwardOffset: 190 },
  ],
};

/** Handcrafted moments — placement only; variants are fixed in {@link ObstacleTypes}. */
export const SPAWN_PATTERN_LIBRARY: readonly SpawnPattern[] = [
  // —— Easy (readable, obvious lane) ——
  {
    id: 'single_rock',
    weight: 10,
    difficulty: 'easy',
    obstacles: [{ variant: 'small_rock', laneOffset: 0, forwardOffset: 0 }],
  },
  {
    id: 'single_stump',
    weight: 9,
    difficulty: 'easy',
    obstacles: [{ variant: 'tree_stump', laneOffset: 1, forwardOffset: 0 }],
  },
  {
    id: 'gentle_left_weave',
    weight: 11,
    difficulty: 'easy',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 130 },
    ],
  },
  {
    id: 'gentle_right_weave',
    weight: 11,
    difficulty: 'easy',
    obstacles: [
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 0 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 130 },
    ],
  },
  {
    id: 'wide_gate',
    weight: 10,
    difficulty: 'easy',
    obstacles: [
      { variant: 'small_rock', laneOffset: -2, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 2, forwardOffset: 0 },
    ],
  },
  {
    id: 'offset_gate_easy',
    weight: 9,
    difficulty: 'easy',
    obstacles: [
      { variant: 'tree_stump', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 110 },
    ],
  },
  {
    id: 'rock_ahead_left',
    weight: 8,
    difficulty: 'easy',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 0, forwardOffset: 150 },
    ],
  },
  {
    id: 'rock_ahead_right',
    weight: 8,
    difficulty: 'easy',
    obstacles: [
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 0, forwardOffset: 150 },
    ],
  },
  {
    id: 'staircase_left_easy',
    weight: 8,
    difficulty: 'easy',
    obstacles: [
      { variant: 'tree_stump', laneOffset: 1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 120 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 240 },
    ],
  },
  {
    id: 'staircase_right_easy',
    weight: 8,
    difficulty: 'easy',
    obstacles: [
      { variant: 'tree_stump', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 120 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 240 },
    ],
  },

  // —— Medium (continuous steer, depth-led) ——
  {
    id: 's_turn',
    weight: 9,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 140 },
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 280 },
    ],
  },
  {
    id: 'double_slalom',
    weight: 8,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 110 },
      { variant: 'tree', laneOffset: -1, forwardOffset: 220 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 330 },
    ],
  },
  {
    id: 'narrow_gate',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 0 },
    ],
  },
  {
    id: 'offset_gate',
    weight: 8,
    difficulty: 'medium',
    obstacles: [
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 0 },
      { variant: 'large_boulder', laneOffset: 1, forwardOffset: 100 },
    ],
  },
  {
    id: 'rock_into_tree',
    weight: 8,
    difficulty: 'medium',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 150 },
    ],
  },
  {
    id: 'tree_into_rock',
    weight: 8,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: 1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 150 },
    ],
  },
  {
    id: 'alternating_stumps',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree_stump', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree_stump', laneOffset: 1, forwardOffset: 100 },
      { variant: 'tree_stump', laneOffset: -1, forwardOffset: 200 },
    ],
  },
  {
    id: 'boulder_weave',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 0 },
      { variant: 'large_boulder', laneOffset: 1, forwardOffset: 130 },
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 260 },
    ],
  },
  {
    id: 'diagonal_weave',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'small_rock', laneOffset: -2, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 0, forwardOffset: 120 },
      { variant: 'large_boulder', laneOffset: 1, forwardOffset: 250 },
    ],
  },
  {
    id: 'staircase_left',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: 1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 110 },
      { variant: 'tree_stump', laneOffset: -2, forwardOffset: 220 },
    ],
  },
  {
    id: 'staircase_right',
    weight: 7,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 110 },
      { variant: 'tree_stump', laneOffset: 2, forwardOffset: 220 },
    ],
  },
  {
    id: 'fence_funnel',
    weight: 6,
    difficulty: 'medium',
    obstacles: [
      { variant: 'wooden_fence', laneOffset: -2, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 140 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 260 },
    ],
  },
  {
    id: 'slalom_trees',
    weight: 8,
    difficulty: 'medium',
    obstacles: [
      { variant: 'tree', laneOffset: -1, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 120 },
      { variant: 'tree', laneOffset: -1, forwardOffset: 240 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 360 },
    ],
  },

  // —— Hard ( tighter timing, still one clear line ) ——
  CABIN_AVOIDANCE_PATTERN,
  CABIN_FLANK_WEAVE_PATTERN,
  {
    id: 'fence_edge_chicane',
    weight: 5,
    difficulty: 'hard',
    obstacles: [
      { variant: 'wooden_fence', laneOffset: -2, forwardOffset: 0 },
      { variant: 'tree', laneOffset: 1, forwardOffset: 130 },
      { variant: 'wooden_fence', laneOffset: 2, forwardOffset: 270 },
    ],
  },
  {
    id: 'double_gate',
    weight: 4,
    difficulty: 'hard',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 0 },
      { variant: 'tree_stump', laneOffset: -1, forwardOffset: 150 },
      { variant: 'tree_stump', laneOffset: 1, forwardOffset: 150 },
    ],
  },
  {
    id: 'boulder_chicane',
    weight: 5,
    difficulty: 'hard',
    obstacles: [
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 0 },
      { variant: 'large_boulder', laneOffset: 1, forwardOffset: 90 },
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 180 },
      { variant: 'small_rock', laneOffset: 0, forwardOffset: 280 },
    ],
  },
  {
    id: 'mixed_chicane',
    weight: 5,
    difficulty: 'hard',
    obstacles: [
      { variant: 'tree', laneOffset: 1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 110 },
      { variant: 'large_boulder', laneOffset: 1, forwardOffset: 220 },
    ],
  },
  {
    id: 'tight_s_turn',
    weight: 4,
    difficulty: 'hard',
    obstacles: [
      { variant: 'tree', laneOffset: -2, forwardOffset: 0 },
      { variant: 'tree_stump', laneOffset: 0, forwardOffset: 95 },
      { variant: 'tree', laneOffset: 2, forwardOffset: 190 },
      { variant: 'small_rock', laneOffset: 0, forwardOffset: 290 },
    ],
  },
  {
    id: 'rock_gate_stagger',
    weight: 5,
    difficulty: 'hard',
    obstacles: [
      { variant: 'small_rock', laneOffset: -1, forwardOffset: 0 },
      { variant: 'small_rock', laneOffset: 1, forwardOffset: 70 },
      { variant: 'large_boulder', laneOffset: -1, forwardOffset: 160 },
    ],
  },
];

export const SPAWN_PATTERN_WEIGHT_TOTAL = SPAWN_PATTERN_LIBRARY.reduce(
  (sum, pattern) => sum + pattern.weight,
  0,
);

function collectPatternsByDifficulty(
  difficulty: SpawnPatternDifficulty,
): readonly SpawnPattern[] {
  return SPAWN_PATTERN_LIBRARY.filter((pattern) => pattern.difficulty === difficulty);
}

/** For future spawn weighting — not used by pickWeightedSpawnPattern today. */
export const SPAWN_PATTERNS_EASY = collectPatternsByDifficulty('easy');
export const SPAWN_PATTERNS_MEDIUM = collectPatternsByDifficulty('medium');
export const SPAWN_PATTERNS_HARD = collectPatternsByDifficulty('hard');

export const SPAWN_PATTERN_DIFFICULTY_WEIGHT_TOTAL: Record<SpawnPatternDifficulty, number> = {
  easy: SPAWN_PATTERNS_EASY.reduce((sum, pattern) => sum + pattern.weight, 0),
  medium: SPAWN_PATTERNS_MEDIUM.reduce((sum, pattern) => sum + pattern.weight, 0),
  hard: SPAWN_PATTERNS_HARD.reduce((sum, pattern) => sum + pattern.weight, 0),
};
