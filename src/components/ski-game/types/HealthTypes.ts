import { GAME_CONFIG } from '../utils/GameConfig';

export type HealthState = {
  currentHealth: number;
  maxHealth: number;
  isInvulnerable: boolean;
  invulnerabilityRemainingMs: number;
  /** Prevents repeat damage from the same obstacle while overlap persists. */
  lastDamagingObstacleId: number;
};

export function createInitialHealthState(): HealthState {
  const maxHealth = GAME_CONFIG.PLAYER_MAX_HEALTH;

  return {
    currentHealth: maxHealth,
    maxHealth,
    isInvulnerable: false,
    invulnerabilityRemainingMs: 0,
    lastDamagingObstacleId: 0,
  };
}

export function resetHealthState(state: HealthState): void {
  const maxHealth = GAME_CONFIG.PLAYER_MAX_HEALTH;
  state.currentHealth = maxHealth;
  state.maxHealth = maxHealth;
  state.isInvulnerable = false;
  state.invulnerabilityRemainingMs = 0;
  state.lastDamagingObstacleId = 0;
}
