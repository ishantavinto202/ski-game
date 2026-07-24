import type { GameEngine } from '../engine/GameEngine';
import type { ObstacleConsequence } from '../utils/score-consequences';
import { COIN_COLLECT_SCORE } from '../utils/score-consequences';

export const MAX_GAMEPLAY_FEEDBACK_ENTRIES = 6;
export const GAMEPLAY_FEEDBACK_LIFE_MS = 850;
export const GAMEPLAY_FEEDBACK_RISE_PX = 28;
const FEEDBACK_STACK_OFFSET_PX = 14;

export type GameplayFeedbackEntry = {
  active: boolean;
  screenX: number;
  screenY: number;
  scoreDelta: number;
  healthDamage: number;
  elapsedMs: number;
  totalLifeMs: number;
};

export type GameplayFeedbackPoolState = {
  entries: GameplayFeedbackEntry[];
};

export type GameplayFeedbackPresentation = {
  screenX: number;
  screenY: number;
  scoreDelta: number;
  healthDamage: number;
  opacity: number;
  riseOffsetY: number;
};

const enginePools = new WeakMap<GameEngine, GameplayFeedbackPoolState>();

const SLOT_INDICES: number[] = Array.from(
  { length: MAX_GAMEPLAY_FEEDBACK_ENTRIES },
  (_, index) => index,
);

function createInactiveEntry(): GameplayFeedbackEntry {
  return {
    active: false,
    screenX: 0,
    screenY: 0,
    scoreDelta: 0,
    healthDamage: 0,
    elapsedMs: 0,
    totalLifeMs: GAMEPLAY_FEEDBACK_LIFE_MS,
  };
}

export function createGameplayFeedbackPoolState(): GameplayFeedbackPoolState {
  const entries: GameplayFeedbackEntry[] = new Array(MAX_GAMEPLAY_FEEDBACK_ENTRIES);
  for (let index = 0; index < MAX_GAMEPLAY_FEEDBACK_ENTRIES; index += 1) {
    entries[index] = createInactiveEntry();
  }
  return { entries };
}

export function getGameplayFeedbackPool(engine: GameEngine): GameplayFeedbackPoolState {
  let pool = enginePools.get(engine);
  if (!pool) {
    pool = createGameplayFeedbackPoolState();
    enginePools.set(engine, pool);
  }
  return pool;
}

export function resetGameplayFeedbackPool(pool: GameplayFeedbackPoolState): void {
  const entries = pool.entries;
  for (let index = 0; index < entries.length; index += 1) {
    entries[index].active = false;
    entries[index].elapsedMs = 0;
  }
}

function findInactiveEntrySlot(pool: GameplayFeedbackPoolState): GameplayFeedbackEntry | null {
  const entries = pool.entries;
  for (let index = 0; index < entries.length; index += 1) {
    if (!entries[index].active) {
      return entries[index];
    }
  }
  return null;
}

function countActiveEntries(pool: GameplayFeedbackPoolState): number {
  let count = 0;
  const entries = pool.entries;
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].active) {
      count += 1;
    }
  }
  return count;
}

export function spawnGameplayFeedback(
  engine: GameEngine,
  params: { scoreDelta: number; healthDamage: number },
): void {
  const player = engine.playerRef.current;
  if (!player) {
    return;
  }

  const pool = getGameplayFeedbackPool(engine);
  const slot = findInactiveEntrySlot(pool);
  if (!slot) {
    return;
  }

  const stackIndex = countActiveEntries(pool);

  slot.active = true;
  slot.screenX = player.x + player.width * 0.5;
  slot.screenY = player.y - 12 - stackIndex * FEEDBACK_STACK_OFFSET_PX;
  slot.scoreDelta = params.scoreDelta;
  slot.healthDamage = params.healthDamage;
  slot.elapsedMs = 0;
  slot.totalLifeMs = GAMEPLAY_FEEDBACK_LIFE_MS;
}

export function spawnGameplayFeedbackForConsequence(
  engine: GameEngine,
  consequence: ObstacleConsequence,
  healthDamageApplied: number,
): void {
  spawnGameplayFeedback(engine, {
    scoreDelta: consequence.scoreDelta,
    healthDamage: healthDamageApplied,
  });
}

export function spawnGameplayFeedbackForCoinCollect(engine: GameEngine): void {
  spawnGameplayFeedback(engine, {
    scoreDelta: COIN_COLLECT_SCORE,
    healthDamage: 0,
  });
}

export function tickGameplayFeedback(engine: GameEngine, frameDeltaMs: number): void {
  const pool = getGameplayFeedbackPool(engine);
  const entries = pool.entries;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry.active) {
      continue;
    }

    entry.elapsedMs += frameDeltaMs;
    if (entry.elapsedMs >= entry.totalLifeMs) {
      entry.active = false;
      entry.elapsedMs = 0;
    }
  }
}

export function resolveGameplayFeedbackPresentation(
  entry: GameplayFeedbackEntry,
): GameplayFeedbackPresentation | null {
  if (!entry.active || entry.totalLifeMs <= 0) {
    return null;
  }

  const progress = entry.elapsedMs / entry.totalLifeMs;
  const opacity = progress >= 1 ? 0 : 1 - progress;

  return {
    screenX: entry.screenX,
    screenY: entry.screenY,
    scoreDelta: entry.scoreDelta,
    healthDamage: entry.healthDamage,
    opacity,
    riseOffsetY: GAMEPLAY_FEEDBACK_RISE_PX * progress,
  };
}

export function getGameplayFeedbackSlotIndices(): readonly number[] {
  return SLOT_INDICES;
}

export function formatGameplayFeedbackScoreLine(scoreDelta: number): string {
  if (scoreDelta >= 0) {
    return `+${scoreDelta} SCORE`;
  }
  return `${scoreDelta} SCORE`;
}

export function formatGameplayFeedbackHealthLine(healthDamage: number): string {
  if (healthDamage <= 0) {
    return '';
  }
  const label = healthDamage === 1 ? 'HEART' : 'HEARTS';
  return `-${healthDamage} ${label}`;
}
