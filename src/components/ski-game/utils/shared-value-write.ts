import type { SharedValue } from 'react-native-reanimated';

import { profileSharedWrite } from '../profiling/PerformanceProfiling';
import { GAME_CONFIG } from './GameConfig';

/** Avoid redundant SharedValue writes (and UI-thread style invalidation) when unchanged. */
function writeSharedNumberUnprofiled(shared: SharedValue<number>, next: number): void {
  if (shared.value !== next) {
    shared.value = next;
  }
}

function writeSharedNumberProfiled(shared: SharedValue<number>, next: number): void {
  if (shared.value !== next) {
    shared.value = next;
    profileSharedWrite(true);
    return;
  }
  profileSharedWrite(false);
}

/**
 * Select the profiled implementation once at module load. The normal game path
 * does not pay a profiling function call/branch for every SharedValue update.
 */
export const writeSharedNumber: (
  shared: SharedValue<number>,
  next: number,
) => void = GAME_CONFIG.PERFORMANCE_PROFILING
  ? writeSharedNumberProfiled
  : writeSharedNumberUnprofiled;
