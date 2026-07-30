export const GAME_CONFIG = {
  /**
   * Portrait design reference (e.g. iPhone logical points).
   * Used for tuning ratios — runtime layout always comes from onLayout, not these values.
   */
  REFERENCE_VIEWPORT_WIDTH: 390,
  REFERENCE_VIEWPORT_HEIGHT: 844,

  PLAYER_WIDTH: 44,
  PLAYER_HEIGHT: 64,
  /**
   * Visual skier render size (keeps atlas aspect 304×273).
   * Independent of gameplay / collision footprint (`PLAYER_WIDTH` / `PLAYER_HEIGHT`).
   */
  PLAYER_VISUAL_WIDTH: 71,
  PLAYER_VISUAL_HEIGHT: 64,
  /** Rendering-only offset from gameplay center (px). Does not move world/collision. */
  PLAYER_VISUAL_OFFSET_X: 0,
  PLAYER_VISUAL_OFFSET_Y: 0,
  /** Skier sprite-sheet animation rate (independent of 60 FPS render). */
  PLAYER_SPRITE_ANIMATION_FPS: 12,
  /** Draw translucent gameplay AABB over the skier (development tuning only). */
  DEBUG_PLAYER_HITBOX: false,
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
   * Phase 3.5 runtime profiler. When false, all profiling hooks no-op.
   * Overlay mounts only when this is true AND `__DEV__`. Never enable for production builds.
   */
  PERFORMANCE_PROFILING: false,

  /**
   * Bottleneck isolation (only when PERFORMANCE_PROFILING is true).
   * All `true` = baseline. Flip ONE to `false`, play ~10s, read overlay FPS.
   * Recover to ≥~55 FPS → that feature is the bottleneck. Else re-enable and try the next.
   *
   * Order: ObstacleRenderer → SnowRenderer → SkiTrack → Particles → Coins →
   * Chaser → Spawn → HUD → Camera → Shadows → Animation
   */
  PERF_ISOLATION: {
    OBSTACLE_RENDERER: true,
    SNOW_RENDERER: true,
    SKI_TRACK: true,
    PARTICLES: true,
    COINS: true,
    CHASER: true,
    SPAWN: true,
    HUD: true,
    CAMERA: true,
    /** No shadow system in this game — reserved no-op for the isolation flowchart. */
    SHADOWS: true,
    ANIMATION: true,
  },

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
  /** Max consecutive groups allowed to leave one edge uncontested (early → late). */
  OBSTACLE_EDGE_OPEN_GROUP_LIMIT_EARLY: 3,
  OBSTACLE_EDGE_OPEN_GROUP_LIMIT_MID: 2,
  OBSTACLE_EDGE_OPEN_GROUP_LIMIT_LATE: 1,
  /**
   * Minimum center displacement (px) an edge-pressure formation must require.
   * ~65% of one reference lane; intentionally well above a 5–10 px edge wiggle.
   */
  EDGE_PRESSURE_MIN_INWARD_CLEARANCE: 58,
  /** Groups that must pass after an edge-pressure formation before another can fire. */
  EDGE_PRESSURE_MIN_COOLDOWN_GROUPS: 2,

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
  /**
   * Maximum newly visible native visual subtrees mounted by one pooled renderer
   * per display frame. The render margins provide enough off-screen lead to
   * stagger a formation without changing its visible timing or gameplay state.
   */
  VISUAL_PRELOAD_MOUNTS_PER_RENDERER_FRAME: 1,
  /** Inset (px) applied to player AABB for hit tests. */
  PLAYER_COLLISION_PADDING: 4,
  /** Inset (px) applied to obstacle AABB for hit tests. */
  OBSTACLE_COLLISION_PADDING: 2,
  /** Draw translucent physical hitboxes over obstacles (development tuning only). */
  DEBUG_OBSTACLE_HITBOXES: false,
  /** Log rejected/repositioned obstacle spawn placements (development tuning only). */
  DEBUG_OBSTACLE_SPACING: false,
  /**
   * Extra horizontal clearance added to the player collision width when validating
   * passable gaps between obstacle gameplay footprints (px).
   */
  OBSTACLE_PASSAGE_SAFETY_MARGIN: 14,
  /**
   * Extra vertical clearance added to the player collision height when validating
   * passable gaps between stacked obstacle gameplay footprints (px).
   */
  OBSTACLE_VERTICAL_SAFETY_MARGIN: 12,
  /** Deterministic lane/world-X correction attempts per pattern obstacle before skip. */
  MAX_OBSTACLE_PLACEMENT_ATTEMPTS: 4,
  /**
   * Environment obstacle render + collision footprint multiplier.
   * Applied once to design-base `*_SIZE` values via `OBSTACLE_VARIANT_DIMENSIONS`.
   * Does not affect player, chaser, pickups, or HUD.
   */
  OBSTACLE_ASSET_SCALE: 1.45,

  /** Design-base gameplay footprints (px) — multiplied by `OBSTACLE_ASSET_SCALE` at runtime. */
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

  /** Cosmetic snow-surface imperfections (visual only — no collision). */
  MAX_SNOW_SURFACE_DETAILS: 24,
  /** Authored PNG opacity multiplier (1 = as authored). */
  SNOW_SURFACE_OPACITY: 0.72,
  SNOW_SURFACE_SCALE_MIN: 0.8,
  SNOW_SURFACE_SCALE_MAX: 1.15,
  /** Placement-time exclusion around obstacle visual bounds (px). */
  SNOW_SURFACE_PLACEMENT_OBSTACLE_PADDING: 24,
  /** Runtime cull padding — tighter so details may sit near obstacles without large holes. */
  SNOW_SURFACE_RUNTIME_OBSTACLE_PADDING: 12,
  /** Bounded X retries when a candidate overlaps an obstacle visual footprint. */
  SNOW_SURFACE_MAX_PLACEMENT_ATTEMPTS: 6,
  /** Irregular vertical gaps between placements (px). */
  SNOW_SURFACE_SPACING_MIN: 70,
  SNOW_SURFACE_SPACING_MAX: 150,
  /** Horizontal inset from viewport edges for detail centers (px). */
  SNOW_SURFACE_HORIZONTAL_PADDING: 16,
  /** World Y lead above scroll top before first placement (keeps start area clean). */
  SNOW_SURFACE_INITIAL_LEAD: 120,
  /** How far ahead of scroll top to keep the pool filled (px). */
  SNOW_SURFACE_LOOKAHEAD: 1000,
  SNOW_SURFACE_DESPAWN_MARGIN: 64,
  SNOW_SURFACE_RENDER_MARGIN: 64,

  /** World-space dual ski track carved into the snow (visual only). */
  SKI_TRACK_MAX_POINTS: 48,
  SKI_TRACK_SAMPLE_DISTANCE: 6,
  SKI_TRACK_WIDTH: 4,
  SKI_TRACK_SEPARATION: 12,
  SKI_TRACK_OPACITY: 0.38,
  SKI_TRACK_OPACITY_FAR: 0.15,
  SKI_TRACK_SEGMENT_OVERLAP: 2,
  SKI_TRACK_RENDER_MARGIN: 48,
  /**
   * SVG geometry refresh cadence. The whole track layer still follows camera
   * and scroll every display frame; only immutable path-string rebuilding is
   * capped to avoid periodic JS/UI string-transfer spikes.
   */
  SKI_TRACK_PATH_SYNC_INTERVAL_MS: 50,

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

  /**
   * Chaser placeholder footprint (px) — stable for a future sprite swap.
   * Slightly smaller than the player so the silhouette reads as a distinct follower.
   */
  CHASER_WIDTH: 40,
  CHASER_HEIGHT: 58,
  /**
   * `currentGap` = player-top → chaser-top (px). Edge-to-edge snow strip =
   * `currentGap − PLAYER_HEIGHT` (player bottom to chaser top).
   */
  /** 3-heart vertical target (player-top → chaser-top). */
  CHASER_SAFE_GAP: 180,
  /** 2-heart vertical target; also intro / Play Again starting `currentGap`. */
  CHASER_PRESSURE_GAP: 128,
  /** 1-heart vertical target (~32 px visible edge-to-edge snow). */
  CHASER_DANGER_GAP: 96,
  /** Defensive floor clamp only — not a normal health target. */
  CHASER_MIN_GAP: 80,
  /** Temporary separation added to health target while Speed Boost is active. */
  CHASER_BOOST_ESCAPE_BONUS: 90,
  /** Exponential smoothing when boost opens gap (currentGap → larger target). */
  CHASER_BOOST_ESCAPE_SMOOTHING: 6,
  /** Exponential smoothing for normal gap changes and post-boost catch-up. */
  CHASER_GAP_SMOOTHING: 3.5,
  /** Exponential smoothing rate for chaser X → path target. */
  CHASER_HORIZONTAL_SMOOTHING: 5.5,
  /** Base vertical approach window above Chaser for local visual avoidance (px). */
  CHASER_AVOID_LOOKAHEAD: 120,
  /** Extra approach px per px of estimated required lateral dodge. */
  CHASER_LOOKAHEAD_PER_LATERAL_PX: 1.75,
  /** Horizontal padding for threat tests and side placement (px). */
  CHASER_AVOID_PADDING: 10,
  /**
   * Chaser-only visual avoidance floor (px). Gameplay collision AABBs unchanged.
   * Floors tiny rocks/stumps so the Chaser sprite has room to pass beside them.
   */
  CHASER_MIN_AVOID_OBSTACLE_WIDTH: 44,
  CHASER_MIN_AVOID_OBSTACLE_HEIGHT: 48,
  /**
   * Obstacle avoidance envelope cleared once its top passes this margin below
   * Chaser bottom (px). Uses Chaser visual envelope, not gameplay AABB alone.
   */
  CHASER_AVOID_PASS_MARGIN: 8,
  /**
   * Opposite-side clearance must beat the preferred side by at least this many
   * px before a LEFT↔RIGHT reversal is allowed (spatial hysteresis, not a timer).
   */
  CHASER_REVERSAL_CLEARANCE_ADVANTAGE: 16,
  /** Horizontal smoothing while actively steering around an obstacle. */
  CHASER_AVOIDANCE_SMOOTHING: 8,
  /** No micro-corrections toward path target while within this band (px). */
  CHASER_FOLLOW_DEAD_ZONE: 10,
  /** World-Y spacing between Player path breadcrumbs (px). */
  CHASER_PATH_SAMPLE_SPACING: 12,
  /** Pre-allocated path ring-buffer capacity (~576 world px at 12 px spacing). */
  CHASER_PATH_BUFFER_CAPACITY: 48,
} as const;

export type GameConfig = typeof GAME_CONFIG;

export type PerfIsolationFeature = keyof typeof GAME_CONFIG.PERF_ISOLATION;

/**
 * Isolation gate: `false` means skip that feature for the bottleneck hunt.
 * Always `true` when PERFORMANCE_PROFILING is off so production paths stay intact.
 */
export function perfFeatureEnabled(feature: PerfIsolationFeature): boolean {
  if (!GAME_CONFIG.PERFORMANCE_PROFILING) {
    return true;
  }
  // Widen literal `true` from `as const` so isolation `false` branches stay reachable.
  return Boolean(GAME_CONFIG.PERF_ISOLATION[feature]);
}

/** Features currently flipped off (for overlay). Empty when profiling is off. */
export function listDisabledPerfIsolationFeatures(): PerfIsolationFeature[] {
  if (!GAME_CONFIG.PERFORMANCE_PROFILING) {
    return [];
  }
  const disabled: PerfIsolationFeature[] = [];
  const flags = GAME_CONFIG.PERF_ISOLATION;
  for (const key of Object.keys(flags) as PerfIsolationFeature[]) {
    if (!Boolean(flags[key])) {
      disabled.push(key);
    }
  }
  return disabled;
}
