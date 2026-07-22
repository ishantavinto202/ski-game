import type { GameEngine } from '../engine/GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const MAX_COLLISION_BURST_PARTICLES = 64;

const BURST_FRAGMENT_COUNT_MIN = 8;
const BURST_FRAGMENT_COUNT_MAX = 12;

const BURST_LIFE_MIN_MS = 250;
const BURST_LIFE_MAX_MS = 350;

const BURST_SIZE_MIN = 3;
const BURST_SIZE_MAX = 6;

const BURST_SPEED_MIN = 72;
const BURST_SPEED_MAX = 196;

const BURST_DAMPING_PER_SECOND = 4.2;
const BURST_OPACITY_MAX = 0.88;
const BURST_RENDER_MARGIN = 48;

export type CollisionBurstParticle = {
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

export type CollisionBurstPoolState = {
  particles: CollisionBurstParticle[];
  lastBurstObstacleId: number;
};

export type CollisionBurstScreenRect = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  rotation: number;
};

const enginePools = new WeakMap<GameEngine, CollisionBurstPoolState>();

function createInactiveParticle(): CollisionBurstParticle {
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

export function createCollisionBurstPoolState(): CollisionBurstPoolState {
  const particles: CollisionBurstParticle[] = new Array(MAX_COLLISION_BURST_PARTICLES);
  for (let index = 0; index < MAX_COLLISION_BURST_PARTICLES; index += 1) {
    particles[index] = createInactiveParticle();
  }
  return {
    particles,
    lastBurstObstacleId: 0,
  };
}

export function getCollisionBurstPool(engine: GameEngine): CollisionBurstPoolState {
  let pool = enginePools.get(engine);
  if (!pool) {
    pool = createCollisionBurstPoolState();
    enginePools.set(engine, pool);
  }
  return pool;
}

export function resetCollisionBurstPool(pool: CollisionBurstPoolState): void {
  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    particles[index].active = false;
  }
  pool.lastBurstObstacleId = 0;
}

function findInactiveParticleSlot(pool: CollisionBurstPoolState): CollisionBurstParticle | null {
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

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getPlayerImpactWorldPosition(engine: GameEngine): { worldX: number; worldY: number } | null {
  const player = engine.playerRef.current;
  if (!player) {
    return null;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const cameraOffsetX = engine.cameraRef.current.offsetX;
  const centerScreenX = player.x + player.width * 0.5;
  const centerScreenY = player.y + player.height * 0.55;

  return {
    worldX: centerScreenX + cameraOffsetX,
    worldY: scrollOffsetY - centerScreenY,
  };
}

function spawnBurstFragment(
  pool: CollisionBurstPoolState,
  originWorldX: number,
  originWorldY: number,
): void {
  const slot = findInactiveParticleSlot(pool);
  if (!slot) {
    return;
  }

  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(BURST_SPEED_MIN, BURST_SPEED_MAX);
  const totalLifeMs = randomRange(BURST_LIFE_MIN_MS, BURST_LIFE_MAX_MS);

  slot.active = true;
  slot.worldX = originWorldX + randomRange(-6, 6);
  slot.worldY = originWorldY + randomRange(-6, 6);
  slot.velocityX = Math.cos(angle) * speed;
  slot.velocityY = Math.sin(angle) * speed;
  slot.size = randomRange(BURST_SIZE_MIN, BURST_SIZE_MAX);
  slot.rotation = randomRange(0, 360);
  slot.remainingLifeMs = totalLifeMs;
  slot.totalLifeMs = totalLifeMs;
}

function spawnCollisionBurstAtImpact(engine: GameEngine, pool: CollisionBurstPoolState): void {
  const origin = getPlayerImpactWorldPosition(engine);
  if (!origin) {
    return;
  }

  const fragmentCount = randomInt(BURST_FRAGMENT_COUNT_MIN, BURST_FRAGMENT_COUNT_MAX);
  for (let index = 0; index < fragmentCount; index += 1) {
    spawnBurstFragment(pool, origin.worldX, origin.worldY);
  }
}

function updateBurstParticle(particle: CollisionBurstParticle, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;
  particle.worldX += particle.velocityX * deltaSeconds;
  particle.worldY += particle.velocityY * deltaSeconds;

  const damping = Math.max(0, 1 - BURST_DAMPING_PER_SECOND * deltaSeconds);
  particle.velocityX *= damping;
  particle.velocityY *= damping;

  particle.remainingLifeMs -= deltaMs;
  if (particle.remainingLifeMs <= 0) {
    particle.active = false;
    particle.remainingLifeMs = 0;
  }
}

function tryTriggerCollisionBurst(engine: GameEngine, pool: CollisionBurstPoolState): void {
  const collision = engine.collisionRef.current;
  if (!collision.hasCollision) {
    pool.lastBurstObstacleId = 0;
    return;
  }

  const obstacleId = collision.obstacleId;
  if (obstacleId === pool.lastBurstObstacleId) {
    return;
  }

  pool.lastBurstObstacleId = obstacleId;
  spawnCollisionBurstAtImpact(engine, pool);
}

export function tickCollisionBurst(engine: GameEngine, frameDeltaMs: number): void {
  const pool = getCollisionBurstPool(engine);

  if (!isGameplaySimulationActive(engine.gameStateRef.current)) {
    resetCollisionBurstPool(pool);
    return;
  }

  tryTriggerCollisionBurst(engine, pool);

  if (frameDeltaMs <= 0) {
    return;
  }

  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    if (!particle.active) {
      continue;
    }
    updateBurstParticle(particle, frameDeltaMs);
  }
}

export function collisionBurstParticleToScreenRect(
  particle: CollisionBurstParticle,
  scrollOffsetY: number,
  cameraOffsetX: number,
): CollisionBurstScreenRect {
  const lifeRatio =
    particle.totalLifeMs > 0 ? particle.remainingLifeMs / particle.totalLifeMs : 0;
  const clampedLife = lifeRatio < 0 ? 0 : lifeRatio > 1 ? 1 : lifeRatio;
  const shrink = 0.45 + 0.55 * clampedLife;
  const size = particle.size * shrink;
  const centerScreenY = worldYCenterToScreenY(scrollOffsetY, particle.worldY);
  const centerScreenX = particle.worldX - cameraOffsetX;

  return {
    left: centerScreenX - size * 0.5,
    top: centerScreenY - size * 0.5,
    size,
    opacity: clampedLife * BURST_OPACITY_MAX,
    rotation: particle.rotation,
  };
}

export function isCollisionBurstRectVisible(
  rect: CollisionBurstScreenRect,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const right = rect.left + rect.size;
  const bottom = rect.top + rect.size;
  const margin = BURST_RENDER_MARGIN;

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

export function getCollisionBurstSlotIndices(): readonly number[] {
  return COLLISION_BURST_SLOT_INDICES;
}

const COLLISION_BURST_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_COLLISION_BURST_PARTICLES; index += 1) {
  COLLISION_BURST_SLOT_INDICES.push(index);
}
