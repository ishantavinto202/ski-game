export const GAME_CONFIG = {
  /**
   * Portrait design reference (e.g. iPhone logical points).
   * Used for tuning ratios — runtime layout always comes from onLayout, not these values.
   */
  REFERENCE_VIEWPORT_WIDTH: 390,
  REFERENCE_VIEWPORT_HEIGHT: 844,

  PLAYER_WIDTH: 44,
  PLAYER_HEIGHT: 64,
  /** Normalized horizontal center (0–1) of the player on the game viewport. */
  PLAYER_START_X: 0.5,
  /**
   * Normalized vertical center (0–1) on the game viewport.
   * Default 0.82 ≈ 82% down — lower center with more runway above the skier.
   */
  PLAYER_START_Y: 0.82,
  /**
   * Normalized viewport height reserved below the player anchor (look / padding band).
   * Pairs with `PLAYER_START_Y` for portrait layout tuning (not simulation logic).
   */
  PLAYER_LOOKAHEAD_RATIO: 0.18,

  /** Horizontal movement cap in pixels per second. */
  PLAYER_MAX_SPEED: 320,
  /** Horizontal acceleration while steering (px/s²). */
  PLAYER_ACCELERATION: 1400,
  /** Horizontal deceleration when input is released (px/s²). */
  PLAYER_DECELERATION: 1800,
  /** Minimum distance from viewport left/right edges (px). */
  PLAYER_HORIZONTAL_PADDING: 16,

  /** Starting and maximum player health (hearts). */
  PLAYER_MAX_HEALTH: 3,
  /** Invulnerability duration after taking damage (ms). */
  PLAYER_INVULNERABILITY_MS: 1200,

  /** Maximum visual lean in degrees (positive = right). */
  PLAYER_MAX_LEAN_ANGLE: 14,
  /** Exponential smoothing rate for lean toward target (higher = snappier). */
  PLAYER_LEAN_SMOOTHING: 12,

  /** How much the camera follows player horizontal offset from center (0–1). */
  CAMERA_HORIZONTAL_FOLLOW: 0.35,
  /** Exponential smoothing rate for camera offset (higher = snappier). */
  CAMERA_SMOOTHING: 9,
  /** Maximum horizontal camera offset in pixels (world margin matches this). */
  CAMERA_MAX_OFFSET: 48,

  /** World scroll speed in pixels per second (downward progress). */
  BASE_SCROLL_SPEED: 240,
  /** Time (ms) to linearly ramp from baseline difficulty to max speed / spawn pressure. */
  DIFFICULTY_RAMP_DURATION_MS: 180_000,
  /** Maximum scroll speed multiplier from difficulty (applied in WorldSystem). */
  MAX_DIFFICULTY_SPEED_MULTIPLIER: 1.6,
  /** Minimum spawn interval multiplier at max difficulty (< 1 = faster spawns). */
  MIN_SPAWN_INTERVAL_MULTIPLIER: 0.55,
  /** Fixed simulation step in milliseconds (~60 FPS). */
  FIXED_TIMESTEP: 1000 / 60,

  /**
   * Share of viewport height above the player used for look-ahead / upstream spawning helpers.
   * World scroll remains top → bottom; larger values reserve more space above the skier.
   */
  LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO: 0.76,

  /** Normalized X (0–1): touch left of this steers left; right steers right. */
  STEER_ZONE_DIVIDER_X: 0.5,

  /** Minimum safe lane width as a fraction of live viewport width. */
  OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO: 0.2,
  /** Maximum obstacle pattern span as a fraction of live viewport width. */
  OBSTACLE_MAX_PATTERN_WIDTH_RATIO: 0.75,

  /** Milliseconds between spawn request emissions. */
  SPAWN_INTERVAL: 1200,
  /** World-space distance above current scroll top to place new spawn requests (tuned for portrait reference height). */
  SPAWN_LOOKAHEAD_DISTANCE: 600,
  /** Horizontal inset for playable lanes and spawn X placement (px). */
  PLAYABLE_WORLD_PADDING: 16,

  /** World-space lead above scroll top for sequential pattern generation (px). */
  POPULATION_LOOKAHEAD: 900,
  /** Minimum obstacle count to maintain within `POPULATION_LOOKAHEAD` (active + pending). */
  MIN_FORWARD_DENSITY: 10,
  /** Random vertical gap between sequential pattern origins (px, after pattern depth). */
  PATTERN_VERTICAL_SPACING_MIN: 160,
  PATTERN_VERTICAL_SPACING_MAX: 320,
  /** Minimum world Y between the top of the previous pattern and the bottom of the next (px). */
  PATTERN_READABILITY_GAP: 48,
  /** Max patterns appended per fixed step (generation throttle). */
  MAX_PATTERNS_PER_FIXED_STEP: 3,
  SPAWN_VALIDATION_PATTERN_MAX_RETRIES: 3,
  /** Hard cap on pickup placement probes per `findClearPickupSpawn` call. */
  SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS: 288,
  /** World Y bands scanned ahead from the pickup base Y (step = `SPAWN_PICKUP_WORLD_Y_RETRY_STEP`). */
  SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS: 36,
  SPAWN_PICKUP_WORLD_Y_RETRY_STEP: 36,
  /**
   * Minimum |ΔworldY| between pickup centers (pending + active).
   * ~2× pickup height / ~1.75× `SPAWN_PICKUP_WORLD_Y_RETRY_STEP` — avoids same-row coin/boost pairs
   * without forcing a fixed offset pattern.
   */
  PICKUP_MIN_VERTICAL_SEPARATION: 64,

  /** Maximum pooled obstacles alive at once. */
  MAX_OBSTACLES: 64,
  /** Extra px below viewport bottom before obstacle pool reuse. */
  OBSTACLE_DESPAWN_MARGIN: 48,
  /** Extra px around viewport when culling obstacle placeholders. */
  OBSTACLE_RENDER_MARGIN: 64,
  /** Inset (px) applied to player AABB for hit tests. */
  PLAYER_COLLISION_PADDING: 4,
  /** Inset (px) applied to obstacle AABB for hit tests. */
  OBSTACLE_COLLISION_PADDING: 2,

  /** Placeholder footprint (px) — stable for future voxel art swap. */
  SMALL_ROCK_SIZE: { width: 32, height: 28 },
  LARGE_BOULDER_SIZE: { width: 60, height: 54 },
  TREE_SIZE: { width: 48, height: 72 },
  TREE_STUMP_SIZE: { width: 34, height: 30 },
  CABIN_SIZE: { width: 82, height: 74 },
  WOODEN_FENCE_SIZE: { width: 72, height: 22 },

  SMALL_ROCK_SPAWN_WEIGHT: 40,
  LARGE_BOULDER_SPAWN_WEIGHT: 20,
  TREE_SPAWN_WEIGHT: 15,
  TREE_STUMP_SPAWN_WEIGHT: 15,
  CABIN_SPAWN_WEIGHT: 5,
  WOODEN_FENCE_SPAWN_WEIGHT: 5,

  /** Decorative edge trees (no collision, separate from SpawnRequests). */
  /** Gap outside playable corridor edge to decorative tree center (px). */
  EDGE_TREE_MARGIN: 20,
  /** When false, decorative trees are not spawned, updated, or rendered (code remains for re-enable). */
  DECORATIVE_TREES_ENABLED: false,
  EDGE_TREE_CLUSTER_SIZE_MIN: 2,
  EDGE_TREE_CLUSTER_SIZE_MAX: 4,
  EDGE_TREE_IN_CLUSTER_SPACING_MIN: 88,
  EDGE_TREE_IN_CLUSTER_SPACING_MAX: 124,
  EDGE_TREE_CLUSTER_GAP_MIN: 320,
  EDGE_TREE_CLUSTER_GAP_MAX: 560,
  MAX_DECORATIVE_TREES: 128,
  DECORATIVE_TREE_DESPAWN_MARGIN: 64,

  /** Maximum pooled coins alive at once. */
  MAX_COINS: 24,
  /** Extra px below viewport bottom before coin pool reuse. */
  COIN_DESPAWN_MARGIN: 48,
  /** Inset (px) applied to coin AABB for collection tests. */
  COIN_COLLISION_PADDING: 4,
  /** Culling padding around viewport for coin draw. */
  COIN_RENDER_MARGIN: 64,

  /** Maximum pooled shield pickups alive at once. */
  MAX_SHIELDS: 12,
  /** Duration of collision immunity after collecting a shield (ms). */
  SHIELD_DURATION_MS: 4000,
  /** Extra px below viewport bottom before shield pool reuse. */
  SHIELD_DESPAWN_MARGIN: 48,
  /** Inset (px) applied to shield pickup AABB for collection tests. */
  SHIELD_COLLISION_PADDING: 4,
  /** Culling padding around viewport for shield pickup draw. */
  SHIELD_RENDER_MARGIN: 64,
  /** Extra clearance (px) when validating shield pickup placement vs obstacles. */
  SHIELD_PICKUP_SPAWN_CLEARANCE: 12,

  /** Maximum pooled speed boost pickups alive at once. */
  MAX_SPEED_BOOSTS: 12,
  /** Duration of scroll speed boost after collection (ms). */
  SPEED_BOOST_DURATION_MS: 4000,
  /** Scroll speed multiplier while boost effect is active. */
  SPEED_BOOST_MULTIPLIER: 1.75,
  /** Extra px below viewport bottom before speed boost pool reuse. */
  SPEED_BOOST_DESPAWN_MARGIN: 48,
  /** Extra viewport padding for speed boost placeholder culling (px). */
  SPEED_BOOST_RENDER_MARGIN: 64,
  /** Inset (px) applied to speed boost pickup AABB for collection tests. */
  SPEED_BOOST_COLLISION_PADDING: 4,
} as const;

export type GameConfig = typeof GAME_CONFIG;
