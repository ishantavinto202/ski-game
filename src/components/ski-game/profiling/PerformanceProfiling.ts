/**
 * Runtime performance profiler — Phase 3.5.
 *
 * Enable via GAME_CONFIG.PERFORMANCE_PROFILING.
 * When false, every public entry point returns immediately (near-zero cost).
 * Overlay / report dump are __DEV__-only and never ship in production builds.
 */

export type TimingBucket = {
  count: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
};

function createBucket(): TimingBucket {
  return { count: 0, totalMs: 0, maxMs: 0, minMs: Number.POSITIVE_INFINITY };
}

function recordBucket(bucket: TimingBucket, elapsedMs: number): void {
  bucket.count += 1;
  bucket.totalMs += elapsedMs;
  if (elapsedMs > bucket.maxMs) {
    bucket.maxMs = elapsedMs;
  }
  if (elapsedMs < bucket.minMs) {
    bucket.minMs = elapsedMs;
  }
}

function bucketAvg(bucket: TimingBucket): number {
  return bucket.count > 0 ? bucket.totalMs / bucket.count : 0;
}

/** Ring buffer of recent frame times for percentile estimates. */
const FRAME_SAMPLE_CAPACITY = 600;

type ProfilerState = {
  enabled: boolean;
  sessionStartedAtMs: number;
  frameCount: number;
  frameTimesMs: Float64Array;
  frameWriteIndex: number;
  frameSampleCount: number;
  worstFrameMs: number;
  bestFrameMs: number;
  systemBuckets: Map<string, TimingBucket>;
  gameLoopBucket: TimingBucket;
  gameEngineFixedBucket: TimingBucket;
  notifyFrameAlwaysBucket: TimingBucket;
  notifyFramePlayingBucket: TimingBucket;
  renderSyncTotalBucket: TimingBucket;
  sharedWrites: number;
  sharedUnchangedSkips: number;
  sharedWritesThisFrame: number;
  sharedSkipsThisFrame: number;
  lastFrameSharedWrites: number;
  lastFrameSharedSkips: number;
  frameListenerCount: number;
  playingFrameListenerCount: number;
  frameCallbacksExecuted: number;
  lastFrameCallbacksExecuted: number;
  collisionChecks: number;
  collisionHits: number;
  collisionEarlyExits: number;
  chaserObstacleScans: number;
  chaserAvoidanceCalls: number;
  chaserAvoidanceBucket: TimingBucket;
  snowOverlapChecks: number;
  snowPlacementRetries: number;
  snowPlacementAttempts: number;
  obstacleSpawns: number;
  pickupSpawns: number;
  spawnValidationRetries: number;
  spawnRejectedAttempts: number;
  loopRunningWhilePausedFrames: number;
  renderSyncWhilePausedFrames: number;
  onFrameWhilePausedFrames: number;
  playingFrames: number;
  pausedOrIdleFrames: number;
  lastOverlaySnapshot: PerformanceOverlaySnapshot | null;
};

export type PerformanceOverlaySnapshot = {
  fps: number;
  frameMs: number;
  jsUpdateMs: number;
  renderSyncMs: number;
  onFrameListeners: number;
  playingFrameListeners: number;
  sharedWritesPerFrame: number;
  sharedSkipsPerFrame: number;
  activeObstacles: number;
  activeSnow: number;
  activeCoins: number;
  activeShields: number;
  activeSpeedBoosts: number;
  activeParticles: number;
  activeSkiSegments: number;
  poolUsagePct: number;
  gameState: string;
};

const state: ProfilerState = {
  enabled: false,
  sessionStartedAtMs: 0,
  frameCount: 0,
  frameTimesMs: new Float64Array(FRAME_SAMPLE_CAPACITY),
  frameWriteIndex: 0,
  frameSampleCount: 0,
  worstFrameMs: 0,
  bestFrameMs: Number.POSITIVE_INFINITY,
  systemBuckets: new Map(),
  gameLoopBucket: createBucket(),
  gameEngineFixedBucket: createBucket(),
  notifyFrameAlwaysBucket: createBucket(),
  notifyFramePlayingBucket: createBucket(),
  renderSyncTotalBucket: createBucket(),
  sharedWrites: 0,
  sharedUnchangedSkips: 0,
  sharedWritesThisFrame: 0,
  sharedSkipsThisFrame: 0,
  lastFrameSharedWrites: 0,
  lastFrameSharedSkips: 0,
  frameListenerCount: 0,
  playingFrameListenerCount: 0,
  frameCallbacksExecuted: 0,
  lastFrameCallbacksExecuted: 0,
  collisionChecks: 0,
  collisionHits: 0,
  collisionEarlyExits: 0,
  chaserObstacleScans: 0,
  chaserAvoidanceCalls: 0,
  chaserAvoidanceBucket: createBucket(),
  snowOverlapChecks: 0,
  snowPlacementRetries: 0,
  snowPlacementAttempts: 0,
  obstacleSpawns: 0,
  pickupSpawns: 0,
  spawnValidationRetries: 0,
  spawnRejectedAttempts: 0,
  loopRunningWhilePausedFrames: 0,
  renderSyncWhilePausedFrames: 0,
  onFrameWhilePausedFrames: 0,
  playingFrames: 0,
  pausedOrIdleFrames: 0,
  lastOverlaySnapshot: null,
};

let profilingEnabled = false;

export function setPerformanceProfilingEnabled(enabled: boolean): void {
  profilingEnabled = enabled;
  state.enabled = enabled;
  if (enabled && state.sessionStartedAtMs === 0) {
    resetPerformanceProfiler();
  }
}

export function isPerformanceProfilingEnabled(): boolean {
  return profilingEnabled;
}

export function resetPerformanceProfiler(): void {
  state.sessionStartedAtMs = performance.now();
  state.frameCount = 0;
  state.frameWriteIndex = 0;
  state.frameSampleCount = 0;
  state.worstFrameMs = 0;
  state.bestFrameMs = Number.POSITIVE_INFINITY;
  state.systemBuckets.clear();
  state.gameLoopBucket = createBucket();
  state.gameEngineFixedBucket = createBucket();
  state.notifyFrameAlwaysBucket = createBucket();
  state.notifyFramePlayingBucket = createBucket();
  state.renderSyncTotalBucket = createBucket();
  state.sharedWrites = 0;
  state.sharedUnchangedSkips = 0;
  state.sharedWritesThisFrame = 0;
  state.sharedSkipsThisFrame = 0;
  state.lastFrameSharedWrites = 0;
  state.lastFrameSharedSkips = 0;
  state.frameCallbacksExecuted = 0;
  state.lastFrameCallbacksExecuted = 0;
  state.collisionChecks = 0;
  state.collisionHits = 0;
  state.collisionEarlyExits = 0;
  state.chaserObstacleScans = 0;
  state.chaserAvoidanceCalls = 0;
  state.chaserAvoidanceBucket = createBucket();
  state.snowOverlapChecks = 0;
  state.snowPlacementRetries = 0;
  state.snowPlacementAttempts = 0;
  state.obstacleSpawns = 0;
  state.pickupSpawns = 0;
  state.spawnValidationRetries = 0;
  state.spawnRejectedAttempts = 0;
  state.loopRunningWhilePausedFrames = 0;
  state.renderSyncWhilePausedFrames = 0;
  state.onFrameWhilePausedFrames = 0;
  state.playingFrames = 0;
  state.pausedOrIdleFrames = 0;
  state.lastOverlaySnapshot = null;
  for (let index = 0; index < FRAME_SAMPLE_CAPACITY; index += 1) {
    state.frameTimesMs[index] = 0;
  }
}

function getSystemBucket(systemId: string): TimingBucket {
  let bucket = state.systemBuckets.get(systemId);
  if (!bucket) {
    bucket = createBucket();
    state.systemBuckets.set(systemId, bucket);
  }
  return bucket;
}

export function profileBegin(): number {
  if (!profilingEnabled) {
    return 0;
  }
  return performance.now();
}

export function profileEndSystem(systemId: string, startedAtMs: number): void {
  if (!profilingEnabled || startedAtMs <= 0) {
    return;
  }
  recordBucket(getSystemBucket(systemId), performance.now() - startedAtMs);
}

export function profileEndBucket(bucket: TimingBucket, startedAtMs: number): void {
  if (!profilingEnabled || startedAtMs <= 0) {
    return;
  }
  recordBucket(bucket, performance.now() - startedAtMs);
}

export function profileGameLoopBegin(): number {
  return profileBegin();
}

export function profileGameLoopEnd(startedAtMs: number): void {
  profileEndBucket(state.gameLoopBucket, startedAtMs);
}

export function profileEngineFixedBegin(): number {
  return profileBegin();
}

export function profileEngineFixedEnd(startedAtMs: number): void {
  profileEndBucket(state.gameEngineFixedBucket, startedAtMs);
}

export function profileNotifyAlwaysBegin(): number {
  return profileBegin();
}

export function profileNotifyAlwaysEnd(startedAtMs: number): void {
  profileEndBucket(state.notifyFrameAlwaysBucket, startedAtMs);
}

export function profileNotifyPlayingBegin(): number {
  return profileBegin();
}

export function profileNotifyPlayingEnd(startedAtMs: number): void {
  if (!profilingEnabled || startedAtMs <= 0) {
    return;
  }
  const elapsed = performance.now() - startedAtMs;
  recordBucket(state.notifyFramePlayingBucket, elapsed);
  // Playing listeners ≈ render sync cost in this architecture.
  recordBucket(state.renderSyncTotalBucket, elapsed);
}

export function profileRecordFrame(
  frameDeltaMs: number,
  simulationActive: boolean,
  syncPlayingWorld: boolean,
  frameListenerCount: number,
  playingFrameListenerCount: number,
): void {
  if (!profilingEnabled) {
    return;
  }

  const clamped = frameDeltaMs > 0 ? frameDeltaMs : 0;
  state.frameCount += 1;
  state.frameTimesMs[state.frameWriteIndex] = clamped;
  state.frameWriteIndex = (state.frameWriteIndex + 1) % FRAME_SAMPLE_CAPACITY;
  if (state.frameSampleCount < FRAME_SAMPLE_CAPACITY) {
    state.frameSampleCount += 1;
  }
  if (clamped > state.worstFrameMs) {
    state.worstFrameMs = clamped;
  }
  if (clamped < state.bestFrameMs) {
    state.bestFrameMs = clamped;
  }

  state.frameListenerCount = frameListenerCount;
  state.playingFrameListenerCount = playingFrameListenerCount;
  state.lastFrameCallbacksExecuted = state.frameCallbacksExecuted;
  state.frameCallbacksExecuted = 0;

  state.lastFrameSharedWrites = state.sharedWritesThisFrame;
  state.lastFrameSharedSkips = state.sharedSkipsThisFrame;
  state.sharedWritesThisFrame = 0;
  state.sharedSkipsThisFrame = 0;

  if (simulationActive) {
    state.playingFrames += 1;
  } else {
    state.pausedOrIdleFrames += 1;
    state.loopRunningWhilePausedFrames += 1;
    state.onFrameWhilePausedFrames += 1;
    if (!syncPlayingWorld) {
      // Always listeners still ran; playing sync skipped.
    } else {
      state.renderSyncWhilePausedFrames += 1;
    }
  }
}

export function profileCountFrameCallback(): void {
  if (!profilingEnabled) {
    return;
  }
  state.frameCallbacksExecuted += 1;
}

export function profileSharedWrite(changed: boolean): void {
  if (!profilingEnabled) {
    return;
  }
  if (changed) {
    state.sharedWrites += 1;
    state.sharedWritesThisFrame += 1;
  } else {
    state.sharedUnchangedSkips += 1;
    state.sharedSkipsThisFrame += 1;
  }
}

export function profileCollisionCheck(earlyExit: boolean, hit: boolean): void {
  if (!profilingEnabled) {
    return;
  }
  state.collisionChecks += 1;
  if (earlyExit) {
    state.collisionEarlyExits += 1;
  }
  if (hit) {
    state.collisionHits += 1;
  }
}

export function profileChaserScan(scanCount: number): void {
  if (!profilingEnabled) {
    return;
  }
  state.chaserObstacleScans += scanCount;
  state.chaserAvoidanceCalls += 1;
}

export function profileChaserAvoidanceBegin(): number {
  return profileBegin();
}

export function profileChaserAvoidanceEnd(startedAtMs: number): void {
  profileEndBucket(state.chaserAvoidanceBucket, startedAtMs);
}

export function profileSnowOverlap(): void {
  if (!profilingEnabled) {
    return;
  }
  state.snowOverlapChecks += 1;
}

export function profileSnowPlacementAttempt(retried: boolean): void {
  if (!profilingEnabled) {
    return;
  }
  state.snowPlacementAttempts += 1;
  if (retried) {
    state.snowPlacementRetries += 1;
  }
}

export function profileObstacleSpawn(): void {
  if (!profilingEnabled) {
    return;
  }
  state.obstacleSpawns += 1;
}

export function profilePickupSpawn(): void {
  if (!profilingEnabled) {
    return;
  }
  state.pickupSpawns += 1;
}

export function profileSpawnValidationRetry(): void {
  if (!profilingEnabled) {
    return;
  }
  state.spawnValidationRetries += 1;
}

export function profileSpawnRejected(): void {
  if (!profilingEnabled) {
    return;
  }
  state.spawnRejectedAttempts += 1;
}

export function profileSetOverlaySnapshot(snapshot: PerformanceOverlaySnapshot): void {
  if (!profilingEnabled) {
    return;
  }
  state.lastOverlaySnapshot = snapshot;
}

function sortedFrameSamples(): number[] {
  const count = state.frameSampleCount;
  const samples: number[] = new Array(count);
  if (count < FRAME_SAMPLE_CAPACITY) {
    for (let index = 0; index < count; index += 1) {
      samples[index] = state.frameTimesMs[index];
    }
  } else {
    for (let index = 0; index < FRAME_SAMPLE_CAPACITY; index += 1) {
      samples[index] = state.frameTimesMs[index];
    }
  }
  samples.sort((a, b) => a - b);
  return samples;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export type PerformanceReportData = {
  sessionSeconds: number;
  frameCount: number;
  avgFrameMs: number;
  worstFrameMs: number;
  bestFrameMs: number;
  onePercentLowFrameMs: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  systems: { id: string; avgMs: number; maxMs: number; totalMs: number; pct: number }[];
  gameLoopAvgMs: number;
  gameEngineFixedAvgMs: number;
  renderSyncAvgMs: number;
  notifyAlwaysAvgMs: number;
  notifyPlayingAvgMs: number;
  frameListeners: number;
  playingFrameListeners: number;
  callbacksPerFrame: number;
  sharedWrites: number;
  sharedSkips: number;
  sharedWritesPerFrame: number;
  sharedSkipsPerFrame: number;
  sharedWritesPerSec: number;
  collisionChecks: number;
  collisionHits: number;
  collisionEarlyExits: number;
  chaserScans: number;
  chaserAvoidanceCalls: number;
  chaserAvoidanceAvgMs: number;
  snowOverlapChecks: number;
  snowPlacementAttempts: number;
  snowPlacementRetries: number;
  obstacleSpawns: number;
  pickupSpawns: number;
  spawnValidationRetries: number;
  spawnRejectedAttempts: number;
  playingFrames: number;
  pausedOrIdleFrames: number;
  loopRunningWhilePausedFrames: number;
  onFrameWhilePausedFrames: number;
  overlay: PerformanceOverlaySnapshot | null;
};

export function collectPerformanceReportData(): PerformanceReportData {
  const now = performance.now();
  const sessionSeconds = Math.max(0.001, (now - state.sessionStartedAtMs) / 1000);
  const samples = sortedFrameSamples();
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index];
  }
  const avgFrameMs = samples.length > 0 ? sum / samples.length : 0;
  const onePercentLowFrameMs = percentile(samples, 0.99);
  const bestFrameMs =
    state.bestFrameMs === Number.POSITIVE_INFINITY ? 0 : state.bestFrameMs;
  const avgFps = avgFrameMs > 0 ? 1000 / avgFrameMs : 0;
  const minFps = state.worstFrameMs > 0 ? 1000 / state.worstFrameMs : 0;
  const maxFps = bestFrameMs > 0 ? 1000 / bestFrameMs : 0;

  let systemTotalMs = 0;
  const systemsRaw: { id: string; avgMs: number; maxMs: number; totalMs: number }[] = [];
  for (const [id, bucket] of state.systemBuckets) {
    systemTotalMs += bucket.totalMs;
    systemsRaw.push({
      id,
      avgMs: bucketAvg(bucket),
      maxMs: bucket.maxMs,
      totalMs: bucket.totalMs,
    });
  }
  systemsRaw.sort((a, b) => b.totalMs - a.totalMs);
  const systems = systemsRaw.map((entry) => ({
    ...entry,
    pct: systemTotalMs > 0 ? (entry.totalMs / systemTotalMs) * 100 : 0,
  }));

  return {
    sessionSeconds,
    frameCount: state.frameCount,
    avgFrameMs,
    worstFrameMs: state.worstFrameMs,
    bestFrameMs,
    onePercentLowFrameMs,
    avgFps,
    minFps,
    maxFps,
    systems,
    gameLoopAvgMs: bucketAvg(state.gameLoopBucket),
    gameEngineFixedAvgMs: bucketAvg(state.gameEngineFixedBucket),
    renderSyncAvgMs: bucketAvg(state.renderSyncTotalBucket),
    notifyAlwaysAvgMs: bucketAvg(state.notifyFrameAlwaysBucket),
    notifyPlayingAvgMs: bucketAvg(state.notifyFramePlayingBucket),
    frameListeners: state.frameListenerCount,
    playingFrameListeners: state.playingFrameListenerCount,
    callbacksPerFrame: state.lastFrameCallbacksExecuted,
    sharedWrites: state.sharedWrites,
    sharedSkips: state.sharedUnchangedSkips,
    sharedWritesPerFrame: state.lastFrameSharedWrites,
    sharedSkipsPerFrame: state.lastFrameSharedSkips,
    sharedWritesPerSec: state.sharedWrites / sessionSeconds,
    collisionChecks: state.collisionChecks,
    collisionHits: state.collisionHits,
    collisionEarlyExits: state.collisionEarlyExits,
    chaserScans: state.chaserObstacleScans,
    chaserAvoidanceCalls: state.chaserAvoidanceCalls,
    chaserAvoidanceAvgMs: bucketAvg(state.chaserAvoidanceBucket),
    snowOverlapChecks: state.snowOverlapChecks,
    snowPlacementAttempts: state.snowPlacementAttempts,
    snowPlacementRetries: state.snowPlacementRetries,
    obstacleSpawns: state.obstacleSpawns,
    pickupSpawns: state.pickupSpawns,
    spawnValidationRetries: state.spawnValidationRetries,
    spawnRejectedAttempts: state.spawnRejectedAttempts,
    playingFrames: state.playingFrames,
    pausedOrIdleFrames: state.pausedOrIdleFrames,
    loopRunningWhilePausedFrames: state.loopRunningWhilePausedFrames,
    onFrameWhilePausedFrames: state.onFrameWhilePausedFrames,
    overlay: state.lastOverlaySnapshot,
  };
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) {
    return 'n/a';
  }
  return n.toFixed(digits);
}

export function buildPerformanceReportMarkdown(
  data: PerformanceReportData,
  viewCounts: {
    animatedViews: number;
    animatedImages: number;
    obstacleSlots: number;
    snowSlots: number;
    skiSegments: number;
    coinSlots: number;
    shieldSlots: number;
    speedBoostSlots: number;
    particleSlots: number;
  },
): string {
  const lines: string[] = [];
  lines.push('# Phase 3.5 — Runtime Performance Report');
  lines.push('');
  lines.push(`**Captured:** ${new Date().toISOString()}`);
  lines.push(`**Session:** ${fmt(data.sessionSeconds, 1)}s · ${data.frameCount} frames`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(
    `Average **${fmt(data.avgFps, 1)} FPS** (${fmt(data.avgFrameMs)} ms/frame). ` +
      `Worst frame **${fmt(data.worstFrameMs)} ms** (~${fmt(data.minFps, 1)} FPS). ` +
      `1% low frame time **${fmt(data.onePercentLowFrameMs)} ms**.`,
  );
  lines.push('');
  if (data.systems.length > 0) {
    lines.push(
      `Most expensive fixed system by total time: **${data.systems[0].id}** ` +
        `(${fmt(data.systems[0].pct, 1)}% of measured system time, avg ${fmt(data.systems[0].avgMs)} ms).`,
    );
  }
  lines.push(
    `Render sync (playing listeners) avg **${fmt(data.renderSyncAvgMs)} ms**. ` +
      `SharedValue writes/frame **${data.sharedWritesPerFrame}** · skips/frame **${data.sharedSkipsPerFrame}**.`,
  );
  lines.push('');
  lines.push('## Frame Timing');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Avg frame time | ${fmt(data.avgFrameMs)} ms |`);
  lines.push(`| Worst frame | ${fmt(data.worstFrameMs)} ms |`);
  lines.push(`| Best frame | ${fmt(data.bestFrameMs)} ms |`);
  lines.push(`| 1% low frame time | ${fmt(data.onePercentLowFrameMs)} ms |`);
  lines.push(`| Avg FPS | ${fmt(data.avgFps, 1)} |`);
  lines.push(`| Min FPS | ${fmt(data.minFps, 1)} |`);
  lines.push(`| Max FPS | ${fmt(data.maxFps, 1)} |`);
  lines.push('');
  lines.push('## System Timing');
  lines.push('');
  lines.push('| Rank | System | Avg ms | Max ms | Total ms | % |');
  lines.push('|------|--------|--------|--------|----------|---|');
  lines.push(
    `| — | GameLoop (full rAF body) | ${fmt(data.gameLoopAvgMs)} | — | — | — |`,
  );
  lines.push(
    `| — | GameEngine.runFixedUpdate | ${fmt(data.gameEngineFixedAvgMs)} | — | — | — |`,
  );
  for (let index = 0; index < data.systems.length; index += 1) {
    const s = data.systems[index];
    lines.push(
      `| ${index + 1} | ${s.id} | ${fmt(s.avgMs)} | ${fmt(s.maxMs)} | ${fmt(s.totalMs, 1)} | ${fmt(s.pct, 1)}% |`,
    );
  }
  lines.push('');
  lines.push('## Renderer Timing');
  lines.push('');
  lines.push('| Rank | Path | Avg ms | Notes |');
  lines.push('|------|------|--------|-------|');
  lines.push(
    `| 1 | Playing frame listeners (render sync) | ${fmt(data.renderSyncAvgMs)} | SharedValue push from JS |`,
  );
  lines.push(
    `| 2 | Always frame listeners | ${fmt(data.notifyAlwaysAvgMs)} | Pause / game-over UI |`,
  );
  lines.push(
    `| 3 | notifyFrame playing phase | ${fmt(data.notifyPlayingAvgMs)} | Same as render sync |`,
  );
  lines.push('');
  lines.push('## Active View Counts');
  lines.push('');
  lines.push('| Resource | Mounted capacity / active |');
  lines.push('|----------|---------------------------|');
  lines.push(`| Obstacle slots | ${viewCounts.obstacleSlots} mounted · active ${data.overlay?.activeObstacles ?? 'n/a'} |`);
  lines.push(`| Snow slots | ${viewCounts.snowSlots} mounted · active ${data.overlay?.activeSnow ?? 'n/a'} |`);
  lines.push(`| Ski track segments | ${viewCounts.skiSegments} mounted · active ${data.overlay?.activeSkiSegments ?? 'n/a'} |`);
  lines.push(`| Coin slots | ${viewCounts.coinSlots} · active ${data.overlay?.activeCoins ?? 'n/a'} |`);
  lines.push(`| Shield slots | ${viewCounts.shieldSlots} · active ${data.overlay?.activeShields ?? 'n/a'} |`);
  lines.push(`| Speed boost slots | ${viewCounts.speedBoostSlots} · active ${data.overlay?.activeSpeedBoosts ?? 'n/a'} |`);
  lines.push(`| Particle slots | ${viewCounts.particleSlots} · active ${data.overlay?.activeParticles ?? 'n/a'} |`);
  lines.push(`| Estimated Animated.View | ${viewCounts.animatedViews} |`);
  lines.push(`| Estimated Animated.Image | ${viewCounts.animatedImages} |`);
  lines.push('');
  lines.push('## SharedValue Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total writes | ${data.sharedWrites} |`);
  lines.push(`| Unchanged skips | ${data.sharedSkips} |`);
  lines.push(`| Writes / frame (last) | ${data.sharedWritesPerFrame} |`);
  lines.push(`| Skips / frame (last) | ${data.sharedSkipsPerFrame} |`);
  lines.push(`| Writes / sec | ${fmt(data.sharedWritesPerSec, 1)} |`);
  lines.push('');
  lines.push('## Memory Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Pool usage (overlay) | ${data.overlay ? `${fmt(data.overlay.poolUsagePct, 1)}%` : 'n/a'} |`);
  lines.push(
    `| Estimated GC pressure | Shared skips ${data.sharedSkips} avoided writes; spawn rejects ${data.spawnRejectedAttempts} |`,
  );
  lines.push('| Note | JS heap size is not available without Hermes sampling — use Flipper/Instruments for absolute memory. |');
  lines.push('');
  lines.push('## Spawn Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Obstacle spawns | ${data.obstacleSpawns} (${fmt(data.obstacleSpawns / data.sessionSeconds, 2)}/s) |`);
  lines.push(`| Pickup spawns | ${data.pickupSpawns} (${fmt(data.pickupSpawns / data.sessionSeconds, 2)}/s) |`);
  lines.push(`| Validation retries | ${data.spawnValidationRetries} |`);
  lines.push(`| Rejected attempts | ${data.spawnRejectedAttempts} |`);
  lines.push('');
  lines.push('## Collision Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Checks | ${data.collisionChecks} |`);
  lines.push(`| Hits | ${data.collisionHits} |`);
  lines.push(`| Early exits | ${data.collisionEarlyExits} |`);
  lines.push('');
  lines.push('## Chaser Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Avoidance calls | ${data.chaserAvoidanceCalls} |`);
  lines.push(`| Obstacle scans (sum) | ${data.chaserScans} |`);
  lines.push(`| Avg scans/call | ${fmt(data.chaserAvoidanceCalls > 0 ? data.chaserScans / data.chaserAvoidanceCalls : 0, 1)} |`);
  lines.push(`| Avg avoidance ms | ${fmt(data.chaserAvoidanceAvgMs)} |`);
  lines.push('');
  lines.push('## Snow Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Overlap checks | ${data.snowOverlapChecks} |`);
  lines.push(`| Placement attempts | ${data.snowPlacementAttempts} |`);
  lines.push(`| Placement retries | ${data.snowPlacementRetries} |`);
  const snowBucket = data.systems.find((s) => s.id === 'snow-surface-system');
  lines.push(`| Snow fixedUpdate avg | ${snowBucket ? `${fmt(snowBucket.avgMs)} ms` : 'n/a'} |`);
  lines.push('');
  lines.push('## Pause / Menu');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Playing frames | ${data.playingFrames} |`);
  lines.push(`| Paused/idle frames | ${data.pausedOrIdleFrames} |`);
  lines.push(`| Loop continued while paused | ${data.loopRunningWhilePausedFrames} frames (rAF still scheduled) |`);
  lines.push(`| onFrame always callbacks while paused | ${data.onFrameWhilePausedFrames} frames |`);
  lines.push('');
  lines.push('## onFrame Statistics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Always listeners | ${data.frameListeners} |`);
  lines.push(`| Playing listeners | ${data.playingFrameListeners} |`);
  lines.push(`| Callbacks executed last frame | ${data.callbacksPerFrame} |`);
  lines.push('');
  lines.push('## Top 10 Runtime Bottlenecks');
  lines.push('');
  lines.push('(Ranked by measured total system time, then render sync.)');
  lines.push('');
  const bottlenecks: { name: string; score: number; detail: string }[] = [];
  for (const s of data.systems) {
    bottlenecks.push({
      name: `System:${s.id}`,
      score: s.totalMs,
      detail: `avg ${fmt(s.avgMs)} ms · ${fmt(s.pct, 1)}% of system time`,
    });
  }
  bottlenecks.push({
    name: 'RenderSync:playingListeners',
    score: data.renderSyncAvgMs * data.playingFrames,
    detail: `avg ${fmt(data.renderSyncAvgMs)} ms/frame while playing`,
  });
  bottlenecks.push({
    name: 'SharedValueWrites',
    score: data.sharedWrites * 0.001,
    detail: `${data.sharedWrites} writes · ${fmt(data.sharedWritesPerSec, 0)}/s`,
  });
  bottlenecks.sort((a, b) => b.score - a.score);
  for (let index = 0; index < Math.min(10, bottlenecks.length); index += 1) {
    const b = bottlenecks[index];
    lines.push(`${index + 1}. **${b.name}** — ${b.detail}`);
  }
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  lines.push(
    'Base the next optimization phase **only** on the Top 10 list above after a real device capture.',
  );
  lines.push('');
  if (data.systems[0]) {
    lines.push(
      `- If **${data.systems[0].id}** dominates system %, profile that system next (not assumptions from Phase 1).`,
    );
  }
  if (data.renderSyncAvgMs > data.gameEngineFixedAvgMs) {
    lines.push(
      '- Render sync exceeds fixed-update avg — prioritize further render/SharedValue reductions.',
    );
  } else {
    lines.push(
      '- Fixed-update avg exceeds render sync — prioritize simulation hotspots from the system table.',
    );
  }
  lines.push(
    '- Re-run this dump after each change with `PERFORMANCE_PROFILING` enabled for ~60s of play.',
  );
  lines.push('');
  return lines.join('\n');
}

export function getStaticViewCapacityEstimates(config: {
  MAX_OBSTACLES: number;
  MAX_SNOW_SURFACE_DETAILS: number;
  SKI_TRACK_MAX_POINTS: number;
  MAX_COINS: number;
  MAX_SHIELDS: number;
  MAX_SPEED_BOOSTS: number;
}): {
  animatedViews: number;
  animatedImages: number;
  obstacleSlots: number;
  snowSlots: number;
  skiSegments: number;
  coinSlots: number;
  shieldSlots: number;
  speedBoostSlots: number;
  particleSlots: number;
} {
  const skiSegments = (config.SKI_TRACK_MAX_POINTS - 1) * 2; // player + chaser
  const particleSlots = 64 + 64; // burst + shatter
  // Rough mounted native animated nodes (post Phase 2 architecture).
  const animatedImages =
    config.MAX_OBSTACLES + // 1 image/slot
    config.MAX_SNOW_SURFACE_DETAILS +
    config.MAX_COINS +
    config.MAX_SHIELDS +
    config.MAX_SPEED_BOOSTS +
    2; // player + chaser atlases
  const animatedViews =
    config.MAX_OBSTACLES + // placeholders
    skiSegments * 2 + // dual strokes
    particleSlots +
    6 + // feedback
    20; // HUD / misc
  return {
    animatedViews,
    animatedImages,
    obstacleSlots: config.MAX_OBSTACLES,
    snowSlots: config.MAX_SNOW_SURFACE_DETAILS,
    skiSegments,
    coinSlots: config.MAX_COINS,
    shieldSlots: config.MAX_SHIELDS,
    speedBoostSlots: config.MAX_SPEED_BOOSTS,
    particleSlots,
  };
}

// ponytail: ceiling = import-time self-check only in __DEV__; upgrade = unit test if profiler grows.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const selfCheck = createBucket();
  recordBucket(selfCheck, 10);
  recordBucket(selfCheck, 30);
  if (Math.abs(bucketAvg(selfCheck) - 20) > 1e-9) {
    throw new Error('PerformanceProfiling bucket average self-check failed');
  }
}
