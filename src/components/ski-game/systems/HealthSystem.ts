import type { GameEngine } from '../engine/GameEngine';
import { createInitialHealthState, resetHealthState } from '../types/HealthTypes';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const HEALTH_SYSTEM_ID = 'health-system';

export class HealthSystem implements GameSystem {
  readonly id = HEALTH_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    resetHealthState(engine.healthRef.current);
  }

  unmount(): void {
    if (this.engine) {
      resetHealthState(this.engine.healthRef.current);
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const health = engine.healthRef.current;
    const collision = engine.collisionRef.current;

    if (health.invulnerabilityRemainingMs > 0) {
      health.invulnerabilityRemainingMs -= fixedDeltaMs;
      if (health.invulnerabilityRemainingMs < 0) {
        health.invulnerabilityRemainingMs = 0;
      }
    }

    health.isInvulnerable = health.invulnerabilityRemainingMs > 0;

    if (!collision.hasCollision) {
      health.lastDamagingObstacleId = 0;
      return;
    }

    if (health.isInvulnerable) {
      return;
    }

    if (engine.shieldRef.current.isShieldActive) {
      const obstacleId = collision.obstacleId;
      if (obstacleId === health.lastDamagingObstacleId) {
        return;
      }

      health.lastDamagingObstacleId = obstacleId;
      health.invulnerabilityRemainingMs = GAME_CONFIG.PLAYER_INVULNERABILITY_MS;
      health.isInvulnerable = true;
      return;
    }

    if (health.currentHealth <= 0) {
      return;
    }

    const obstacleId = collision.obstacleId;
    if (obstacleId === health.lastDamagingObstacleId) {
      return;
    }

    health.currentHealth -= 1;
    if (health.currentHealth < 0) {
      health.currentHealth = 0;
    }

    health.lastDamagingObstacleId = obstacleId;
    health.invulnerabilityRemainingMs = GAME_CONFIG.PLAYER_INVULNERABILITY_MS;
    health.isInvulnerable = true;
  }
}
