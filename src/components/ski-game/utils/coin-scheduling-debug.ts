import type { GameEngine } from '../engine/GameEngine';
import type { SpawnKind } from '../types/SpawnTypes';

/** Temporary coin scheduling instrumentation — remove after debugging. */
export const COIN_SCHEDULING_DEBUG_ENABLED = false;

const POOL_LOG_INTERVAL_MS = 10_000;

export type CoinSchedulingDebugCounts = {
  timerFires: number;
  coinTurns: number;
  coinEnqueueAttempts: number;
  coinEnqueueSuccesses: number;
  coinEnqueueFailures: number;
  failuresDueToPendingCap: number;
  failuresDueToPlacement: number;
  coinActivations: number;
  coinStaleDrops: number;
  coinCollections: number;
  coinDespawns: number;
};

const counts: CoinSchedulingDebugCounts = {
  timerFires: 0,
  coinTurns: 0,
  coinEnqueueAttempts: 0,
  coinEnqueueSuccesses: 0,
  coinEnqueueFailures: 0,
  failuresDueToPendingCap: 0,
  failuresDueToPlacement: 0,
  coinActivations: 0,
  coinStaleDrops: 0,
  coinCollections: 0,
  coinDespawns: 0,
};

let poolLogElapsedMs = 0;

export function resetCoinSchedulingDebugCounters(): void {
  counts.timerFires = 0;
  counts.coinTurns = 0;
  counts.coinEnqueueAttempts = 0;
  counts.coinEnqueueSuccesses = 0;
  counts.coinEnqueueFailures = 0;
  counts.failuresDueToPendingCap = 0;
  counts.failuresDueToPlacement = 0;
  counts.coinActivations = 0;
  counts.coinStaleDrops = 0;
  counts.coinCollections = 0;
  counts.coinDespawns = 0;
  poolLogElapsedMs = 0;
}

export function readCoinSchedulingDebugCounts(): Readonly<CoinSchedulingDebugCounts> {
  return counts;
}

function countPendingRequestsByKind(
  engine: GameEngine,
): { pendingCoin: number; pendingObstacle: number; totalPending: number } {
  const spawnState = engine.spawnRef.current;
  const pendingCount = spawnState.pendingCount;
  let pendingCoin = 0;
  let pendingObstacle = 0;

  for (let index = 0; index < pendingCount; index += 1) {
    const kind = spawnState.requests[index].kind;
    if (kind === 'coin') {
      pendingCoin += 1;
    } else if (kind === 'obstacle') {
      pendingObstacle += 1;
    }
  }

  return { pendingCoin, pendingObstacle, totalPending: pendingCount };
}

export function logCoinPickupTimerFired(params: {
  kindCursor: number;
  selectedKind: SpawnKind;
  pendingCount: number;
  canEnqueue: boolean;
}): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.timerFires += 1;
  if (params.selectedKind === 'coin') {
    counts.coinTurns += 1;
  }

  console.log('[COIN TIMER]', {
    pickupTimerFired: true,
    kindCursor: params.kindCursor,
    selectedSpawnKind: params.selectedKind,
    pendingCount: params.pendingCount,
    canEnqueuePickup: params.canEnqueue,
  });
}

export function logCoinTryEnqueuePickupSpawn(params: {
  called: true;
  returned: boolean;
  failureReason?: 'pendingCount >= max' | 'no placement found' | 'lane layout not ready';
  pendingCount: number;
  maxPending: number;
}): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.coinEnqueueAttempts += 1;

  if (params.returned) {
    counts.coinEnqueueSuccesses += 1;
    console.log('[COIN ENQUEUE]', {
      tryEnqueuePickupSpawnCalled: params.called,
      returned: true,
      pendingCount: params.pendingCount,
      maxPending: params.maxPending,
    });
    return;
  }

  counts.coinEnqueueFailures += 1;
  if (params.failureReason === 'pendingCount >= max') {
    counts.failuresDueToPendingCap += 1;
  } else if (params.failureReason === 'no placement found') {
    counts.failuresDueToPlacement += 1;
  }

  console.log('[COIN ENQUEUE]', {
    tryEnqueuePickupSpawnCalled: params.called,
    returned: false,
    reason: params.failureReason ?? 'unknown',
    pendingCount: params.pendingCount,
    maxPending: params.maxPending,
  });
}

export function logCoinSpawnRequestCreated(requestId: number, worldX: number, worldY: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  console.log('[COIN REQUEST]', {
    requestId,
    worldX,
    worldY,
  });
}

export function logCoinSystemReceivedRequest(requestId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  console.log('[COIN CONSUMPTION]', {
    coinSystemReceivedRequest: true,
    requestId,
  });
}

export function logCoinActivated(requestId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.coinActivations += 1;
  console.log('[COIN CONSUMPTION]', {
    activated: true,
    requestId,
  });
}

export function logCoinRetained(requestId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  console.log('[COIN CONSUMPTION]', {
    retained: true,
    requestId,
  });
}

export function logCoinStaleDropped(requestId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.coinStaleDrops += 1;
  console.log('[COIN CONSUMPTION]', {
    staleDropped: true,
    requestId,
  });
}

export function logCoinCollected(coinId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.coinCollections += 1;
  console.log('[COIN CONSUMPTION]', {
    collected: true,
    coinId,
  });
}

export function logCoinDespawned(coinId: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  counts.coinDespawns += 1;
  console.log('[COIN CONSUMPTION]', {
    despawnedBelowViewport: true,
    coinId,
  });
}

export function tickCoinSchedulingPoolDebug(engine: GameEngine, fixedDeltaMs: number): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  poolLogElapsedMs += fixedDeltaMs;
  if (poolLogElapsedMs < POOL_LOG_INTERVAL_MS) {
    return;
  }
  poolLogElapsedMs -= POOL_LOG_INTERVAL_MS;

  const pending = countPendingRequestsByKind(engine);
  const coinActiveCount = engine.coinRef.current.activeCount;

  console.log('[COIN POOL]', {
    coinActiveCount,
    pendingCoinRequests: pending.pendingCoin,
    pendingObstacleRequests: pending.pendingObstacle,
    totalPendingCount: pending.totalPending,
  });
}

export function logCoinSchedulingDebugSummary(): void {
  if (!COIN_SCHEDULING_DEBUG_ENABLED) {
    return;
  }

  const snapshot = readCoinSchedulingDebugCounts();
  console.log(
    [
      '[COIN] Debug summary',
      `Timer fires: ${snapshot.timerFires}`,
      `Coin turns: ${snapshot.coinTurns}`,
      `Coin enqueue attempts: ${snapshot.coinEnqueueAttempts}`,
      `Coin enqueue successes: ${snapshot.coinEnqueueSuccesses}`,
      `Coin enqueue failures: ${snapshot.coinEnqueueFailures}`,
      `Failures due to pending cap: ${snapshot.failuresDueToPendingCap}`,
      `Failures due to placement: ${snapshot.failuresDueToPlacement}`,
      `Coin activations: ${snapshot.coinActivations}`,
      `Coin stale drops: ${snapshot.coinStaleDrops}`,
      `Coin collections: ${snapshot.coinCollections}`,
      `Coin despawns: ${snapshot.coinDespawns}`,
    ].join('\n'),
  );
}
