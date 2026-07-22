import type { SpawnPattern } from '../types/SpawnPatternTypes';

/** Temporary diagnostic — set false after confirming cabin renders. */
export const DEBUG_FORCE_CABIN = true;

const FORCED_CABIN_PATTERN_ID = 'cabin_avoidance';

let debugForceCabinUsed = false;

export function resetDebugForceCabinState(): void {
  debugForceCabinUsed = false;
}

/**
 * Returns `cabin_avoidance` once per run for the first non-safe population slot.
 * Otherwise returns null and callers should use weighted selection.
 */
export function pickForcedCabinPatternIfPending(
  isSafePatternSlot: boolean,
  patternLibrary: readonly SpawnPattern[],
): SpawnPattern | null {
  if (!DEBUG_FORCE_CABIN || debugForceCabinUsed || isSafePatternSlot) {
    return null;
  }

  debugForceCabinUsed = true;
  console.log('[DEBUG] Forced Cabin Pattern Spawned');

  for (let index = 0; index < patternLibrary.length; index += 1) {
    const pattern = patternLibrary[index];
    if (pattern.id === FORCED_CABIN_PATTERN_ID) {
      return pattern;
    }
  }

  return null;
}
