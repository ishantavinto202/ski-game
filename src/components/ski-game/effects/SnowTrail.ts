import type { GameEngine } from '../engine/GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const MAX_SNOW_PARTICLES = 64;

export const SNOW_SPAWN_INTERVAL_MS = 64;
export const SNOW_PARTICLES_PER_SPAWN = 2;

const SNOW_LIFE_MIN_MS = 490;
const SNOW_LIFE_MAX_MS = 630;

const SNOW_SIZE_MIN = 6;
const SNOW_SIZE_MAX = 10;

/** Px below player bottom (visible snow kick-up). */
const SNOW_SPAWN_BELOW_FEET_MIN = 4;
const SNOW_SPAWN_BELOW_FEET_MAX = 12;
/** Lateral offset from center toward left/right ski (outside player width). */
const SNOW_SPAWN_SKI_LATERAL_MIN = 14;
const SNOW_SPAWN_SKI_LATERAL_MAX = 22;

const SNOW_OPACITY_MAX = 1;

/** World-space drift (px/s). */
const SNOW_DRIFT_X_MIN = -36;
const SNOW_DRIFT_X_MAX = 36;
const SNOW_BACKWARD_Y_MIN = 48;
const SNOW_BACKWARD_Y_MAX = 88;

const SNOW_RENDER_MARGIN = 48;

export type SnowTrailParticle = {
  active: boolean;
  worldX: number;
  worldY: number;
  velocityX: number;
  velocityY: number;
  size: number;
  rotation: number;
  remainingLifeMs: number;
  totalLifeMs: number;
};

export type SnowTrailPoolState = {
  particles: SnowTrailParticle[];
  spawnAccumulatorMs: number;
};

export type SnowParticleScreenRect = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  rotation: number;
};

const enginePools = new WeakMap<GameEngine, SnowTrailPoolState>();

function createInactiveParticle(): SnowTrailParticle {
  return {
    active: false,
    worldX: 0,
    worldY: 0,
    velocityX: 0,
    velocityY: 0,
    size: 0,
    rotation: 0,
    remainingLifeMs: 0,
    totalLifeMs: 0,
  };
}

export function createSnowTrailPoolState(): SnowTrailPoolState {
  const particles: SnowTrailParticle[] = new Array(MAX_SNOW_PARTICLES);
  for (let index = 0; index < MAX_SNOW_PARTICLES; index += 1) {
    particles[index] = createInactiveParticle();
  }
  return {
    particles,
    spawnAccumulatorMs: 0,
  };
}

export function getSnowTrailPool(engine: GameEngine): SnowTrailPoolState {
  let pool = enginePools.get(engine);
  if (!pool) {
    pool = createSnowTrailPoolState();
    enginePools.set(engine, pool);
  }
  return pool;
}

export function resetSnowTrailPool(pool: SnowTrailPoolState): void {
  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    particles[index].active = false;
  }
  pool.spawnAccumulatorMs = 0;
}

function findInactiveParticleSlot(pool: SnowTrailPoolState): SnowTrailParticle | null {
  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    if (!particles[index].active) {
      return particles[index];
    }
  }
  return null;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnParticleAtSkis(engine: GameEngine, pool: SnowTrailPoolState): void {
  const slot = findInactiveParticleSlot(pool);
  const player = engine.playerRef.current;
  if (!slot || !player) {
    return;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const cameraOffsetX = engine.cameraRef.current.offsetX;

  const centerScreenX = player.x + player.width * 0.5;
  const belowFeetScreenY =
    player.y + player.height + randomRange(SNOW_SPAWN_BELOW_FEET_MIN, SNOW_SPAWN_BELOW_FEET_MAX);

  const lateral = randomRange(SNOW_SPAWN_SKI_LATERAL_MIN, SNOW_SPAWN_SKI_LATERAL_MAX);
  const skiSide = Math.random() < 0.5 ? -1 : 1;
  const spawnScreenX = centerScreenX + skiSide * lateral;

  const worldX = spawnScreenX + cameraOffsetX;
  const worldY = scrollOffsetY - belowFeetScreenY;

  const totalLifeMs = randomRange(SNOW_LIFE_MIN_MS, SNOW_LIFE_MAX_MS);

  slot.active = true;
  slot.worldX = worldX;
  slot.worldY = worldY;
  slot.velocityX = randomRange(SNOW_DRIFT_X_MIN, SNOW_DRIFT_X_MAX);
  slot.velocityY = -randomRange(SNOW_BACKWARD_Y_MIN, SNOW_BACKWARD_Y_MAX);
  slot.size = randomRange(SNOW_SIZE_MIN, SNOW_SIZE_MAX);
  slot.rotation = randomRange(0, 360);
  slot.remainingLifeMs = totalLifeMs;
  slot.totalLifeMs = totalLifeMs;
}

function updateParticle(particle: SnowTrailParticle, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;
  particle.worldX += particle.velocityX * deltaSeconds;
  particle.worldY += particle.velocityY * deltaSeconds;
  particle.remainingLifeMs -= deltaMs;

  if (particle.remainingLifeMs <= 0) {
    particle.active = false;
    particle.remainingLifeMs = 0;
  }
}

export function tickSnowTrail(engine: GameEngine, frameDeltaMs: number): void {
  const pool = getSnowTrailPool(engine);
  const gameState = engine.gameStateRef.current;

  if (!isGameplaySimulationActive(gameState)) {
    resetSnowTrailPool(pool);
    return;
  }

  if (frameDeltaMs <= 0) {
    return;
  }

  pool.spawnAccumulatorMs += frameDeltaMs;
  while (pool.spawnAccumulatorMs >= SNOW_SPAWN_INTERVAL_MS) {
    pool.spawnAccumulatorMs -= SNOW_SPAWN_INTERVAL_MS;
    for (let count = 0; count < SNOW_PARTICLES_PER_SPAWN; count += 1) {
      spawnParticleAtSkis(engine, pool);
    }
  }

  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    if (!particle.active) {
      continue;
    }
    updateParticle(particle, frameDeltaMs);
  }
}

export function snowParticleToScreenRect(
  particle: SnowTrailParticle,
  scrollOffsetY: number,
  cameraOffsetX: number,
): SnowParticleScreenRect {
  const lifeRatio =
    particle.totalLifeMs > 0 ? particle.remainingLifeMs / particle.totalLifeMs : 0;
  const clampedLife = lifeRatio < 0 ? 0 : lifeRatio > 1 ? 1 : lifeRatio;
  const shrink = 0.5 + 0.5 * clampedLife;
  const size = particle.size * shrink;
  const centerScreenY = worldYCenterToScreenY(scrollOffsetY, particle.worldY);
  const centerScreenX = particle.worldX - cameraOffsetX;

  return {
    left: centerScreenX - size * 0.5,
    top: centerScreenY - size * 0.5,
    size,
    opacity: clampedLife * SNOW_OPACITY_MAX,
    rotation: particle.rotation,
  };
}

export function isSnowParticleRectVisible(
  rect: SnowParticleScreenRect,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const right = rect.left + rect.size;
  const bottom = rect.top + rect.size;
  const margin = SNOW_RENDER_MARGIN;

  if (right < -margin) {
    return false;
  }
  if (rect.left > viewportWidth + margin) {
    return false;
  }
  if (bottom < -margin) {
    return false;
  }
  if (rect.top > viewportHeight + margin) {
    return false;
  }

  return true;
}

export function getSnowTrailSlotIndices(): readonly number[] {
  return SNOW_SLOT_INDICES;
}

const SNOW_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_SNOW_PARTICLES; index += 1) {
  SNOW_SLOT_INDICES.push(index);
}
