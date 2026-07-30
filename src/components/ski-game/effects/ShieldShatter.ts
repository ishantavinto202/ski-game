import type { GameEngine } from '../engine/GameEngine';
import { isGameplaySimulationActive } from '../entities/GameState';
import { worldYCenterToScreenY } from '../utils/world-coordinates';

export const MAX_SHIELD_SHATTER_PARTICLES = 64;

const SHATTER_FRAGMENT_COUNT_MIN = 10;
export const SHIELD_SHATTER_FRAGMENT_COUNT_MAX = 14;

const SHATTER_LIFE_MIN_MS = 300;
const SHATTER_LIFE_MAX_MS = 400;

const SHATTER_SIZE_MIN = 4;
const SHATTER_SIZE_MAX = 8;

const SHATTER_SPEED_MIN = 96;
const SHATTER_SPEED_MAX = 240;

const SHATTER_DAMPING_PER_SECOND = 3.6;
const SHATTER_SPIN_DEG_PER_SECOND = 220;
export const SHIELD_SHATTER_OPACITY_MAX = 0.92;
export const SHIELD_SHATTER_RENDER_MARGIN = 48;

export type ShieldShatterParticle = {
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

export type ShieldShatterPoolState = {
  particles: ShieldShatterParticle[];
  previousShieldActive: boolean;
};

export type ShieldShatterScreenRect = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  rotation: number;
};

const enginePools = new WeakMap<GameEngine, ShieldShatterPoolState>();

function createInactiveParticle(): ShieldShatterParticle {
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

export function createShieldShatterPoolState(): ShieldShatterPoolState {
  const particles: ShieldShatterParticle[] = new Array(MAX_SHIELD_SHATTER_PARTICLES);
  for (let index = 0; index < MAX_SHIELD_SHATTER_PARTICLES; index += 1) {
    particles[index] = createInactiveParticle();
  }
  return {
    particles,
    previousShieldActive: false,
  };
}

export function getShieldShatterPool(engine: GameEngine): ShieldShatterPoolState {
  let pool = enginePools.get(engine);
  if (!pool) {
    pool = createShieldShatterPoolState();
    enginePools.set(engine, pool);
  }
  return pool;
}

export function resetShieldShatterPool(pool: ShieldShatterPoolState): void {
  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    particles[index].active = false;
  }
  pool.previousShieldActive = false;
}

function findInactiveParticleSlot(pool: ShieldShatterPoolState): ShieldShatterParticle | null {
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

function getPlayerShieldWorldPosition(engine: GameEngine): { worldX: number; worldY: number } | null {
  const player = engine.playerRef.current;
  if (!player) {
    return null;
  }

  const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
  const cameraOffsetX = engine.cameraRef.current.offsetX;
  const centerScreenX = player.x + player.width * 0.5;
  const centerScreenY = player.y + player.height * 0.48;

  return {
    worldX: centerScreenX + cameraOffsetX,
    worldY: scrollOffsetY - centerScreenY,
  };
}

function spawnShatterFragment(
  pool: ShieldShatterPoolState,
  originWorldX: number,
  originWorldY: number,
): void {
  const slot = findInactiveParticleSlot(pool);
  if (!slot) {
    return;
  }

  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(SHATTER_SPEED_MIN, SHATTER_SPEED_MAX);
  const totalLifeMs = randomRange(SHATTER_LIFE_MIN_MS, SHATTER_LIFE_MAX_MS);

  slot.active = true;
  slot.worldX = originWorldX + randomRange(-4, 4);
  slot.worldY = originWorldY + randomRange(-4, 4);
  slot.velocityX = Math.cos(angle) * speed;
  slot.velocityY = Math.sin(angle) * speed;
  slot.size = randomRange(SHATTER_SIZE_MIN, SHATTER_SIZE_MAX);
  slot.rotation = randomRange(0, 360);
  slot.remainingLifeMs = totalLifeMs;
  slot.totalLifeMs = totalLifeMs;
}

function spawnShieldShatterAtPlayer(engine: GameEngine, pool: ShieldShatterPoolState): void {
  const origin = getPlayerShieldWorldPosition(engine);
  if (!origin) {
    return;
  }

  const fragmentCount = randomInt(
    SHATTER_FRAGMENT_COUNT_MIN,
    SHIELD_SHATTER_FRAGMENT_COUNT_MAX,
  );
  for (let index = 0; index < fragmentCount; index += 1) {
    spawnShatterFragment(pool, origin.worldX, origin.worldY);
  }
}

function updateShatterParticle(particle: ShieldShatterParticle, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;
  particle.worldX += particle.velocityX * deltaSeconds;
  particle.worldY += particle.velocityY * deltaSeconds;

  const damping = Math.max(0, 1 - SHATTER_DAMPING_PER_SECOND * deltaSeconds);
  particle.velocityX *= damping;
  particle.velocityY *= damping;

  const spinDirection = particle.velocityX >= 0 ? 1 : -1;
  particle.rotation += spinDirection * SHATTER_SPIN_DEG_PER_SECOND * deltaSeconds;

  particle.remainingLifeMs -= deltaMs;
  if (particle.remainingLifeMs <= 0) {
    particle.active = false;
    particle.remainingLifeMs = 0;
  }
}

function tryTriggerShieldShatter(engine: GameEngine, pool: ShieldShatterPoolState): void {
  const shieldActive = engine.shieldRef.current.isShieldActive;
  const collision = engine.collisionRef.current;

  if (pool.previousShieldActive && !shieldActive && collision.hasCollision) {
    spawnShieldShatterAtPlayer(engine, pool);
  }

  pool.previousShieldActive = shieldActive;
}

export function tickShieldShatter(engine: GameEngine, frameDeltaMs: number): void {
  const pool = getShieldShatterPool(engine);

  if (!isGameplaySimulationActive(engine.gameStateRef.current)) {
    resetShieldShatterPool(pool);
    return;
  }

  tryTriggerShieldShatter(engine, pool);

  if (frameDeltaMs <= 0) {
    return;
  }

  const particles = pool.particles;
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    if (!particle.active) {
      continue;
    }
    updateShatterParticle(particle, frameDeltaMs);
  }
}

export function shieldShatterParticleToScreenRect(
  particle: ShieldShatterParticle,
  scrollOffsetY: number,
  cameraOffsetX: number,
): ShieldShatterScreenRect {
  const lifeRatio =
    particle.totalLifeMs > 0 ? particle.remainingLifeMs / particle.totalLifeMs : 0;
  const clampedLife = lifeRatio < 0 ? 0 : lifeRatio > 1 ? 1 : lifeRatio;
  const shrink = 0.4 + 0.6 * clampedLife;
  const size = particle.size * shrink;
  const centerScreenY = worldYCenterToScreenY(scrollOffsetY, particle.worldY);
  const centerScreenX = particle.worldX - cameraOffsetX;

  return {
    left: centerScreenX - size * 0.5,
    top: centerScreenY - size * 0.5,
    size,
    opacity: clampedLife * SHIELD_SHATTER_OPACITY_MAX,
    rotation: particle.rotation,
  };
}

export function isShieldShatterRectVisible(
  rect: ShieldShatterScreenRect,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const right = rect.left + rect.size;
  const bottom = rect.top + rect.size;
  const margin = SHIELD_SHATTER_RENDER_MARGIN;

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

export function getShieldShatterSlotIndices(): readonly number[] {
  return SHIELD_SHATTER_SLOT_INDICES;
}

const SHIELD_SHATTER_SLOT_INDICES: number[] = [];
for (let index = 0; index < MAX_SHIELD_SHATTER_PARTICLES; index += 1) {
  SHIELD_SHATTER_SLOT_INDICES.push(index);
}
