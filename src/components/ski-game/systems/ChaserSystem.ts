import type { GameEngine } from '../engine/GameEngine';
import {
  resetChaserState,
  resolveChaserFinalTargetGap,
  snapChaserBehindPlayer,
} from '../entities/Chaser';
import { resolveChaserHorizontalTargetX } from '../entities/ChaserAvoidance';
import {
  recordChaserPathSample,
  resetChaserPathState,
  resolveChaserWorldY,
  resolvePathFollowX,
  resolvePlayerWorldY,
} from '../entities/ChaserPath';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const CHASER_SYSTEM_ID = 'chaser-system';

const GAP_EPSILON = 0.05;
const POSITION_EPSILON = 0.05;

function resolveLiveFollowX(playerX: number, playerWidth: number): number {
  const playerCenterX = playerX + playerWidth * 0.5;
  return playerCenterX - GAME_CONFIG.CHASER_WIDTH * 0.5;
}

/**
 * Chaser follower — vertical gap from health, horizontal X from player path,
 * obstacle avoidance temporarily overrides horizontal steering only.
 */
export class ChaserSystem implements GameSystem {
  readonly id = CHASER_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    resetChaserState(engine.chaserRef.current);
    const player = engine.playerRef.current;
    if (player) {
      snapChaserBehindPlayer(
        engine.chaserRef.current,
        player.x,
        player.y,
        player.width,
        engine.healthRef.current.currentHealth,
      );
      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      resetChaserPathState(
        engine.chaserRef.current.path,
        resolvePlayerWorldY(scrollOffsetY, player.y),
        resolveLiveFollowX(player.x, player.width),
      );
    }
  }

  unmount(): void {
    if (this.engine) {
      resetChaserState(this.engine.chaserRef.current);
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const player = engine.playerRef.current;
    if (!player) {
      return;
    }

    const chaser = engine.chaserRef.current;
    const health = engine.healthRef.current;
    const deltaSeconds = fixedDeltaMs / 1000;
    const scrollOffsetY = engine.worldRef.current.scrollOffsetY;

    const isSpeedBoostActive = engine.speedBoostRef.current.isSpeedBoostActive;
    chaser.targetGap = resolveChaserFinalTargetGap(
      health.currentHealth,
      isSpeedBoostActive,
    );

    const openingGap = chaser.currentGap < chaser.targetGap;
    const gapSmoothing =
      isSpeedBoostActive && openingGap
        ? GAME_CONFIG.CHASER_BOOST_ESCAPE_SMOOTHING
        : GAME_CONFIG.CHASER_GAP_SMOOTHING;
    const gapDamp = 1 - Math.exp(-gapSmoothing * deltaSeconds);
    let nextGap =
      chaser.currentGap + (chaser.targetGap - chaser.currentGap) * gapDamp;
    if (Math.abs(chaser.targetGap - nextGap) < GAP_EPSILON) {
      nextGap = chaser.targetGap;
    }
    chaser.currentGap = nextGap;

    chaser.y = player.y + chaser.currentGap;

    const liveFollowX = resolveLiveFollowX(player.x, player.width);
    const playerWorldY = resolvePlayerWorldY(scrollOffsetY, player.y);
    recordChaserPathSample(chaser.path, playerWorldY, liveFollowX);

    const chaserWorldY = resolveChaserWorldY(scrollOffsetY, chaser.y);
    const followTargetX = resolvePathFollowX(chaser.path, chaserWorldY);

    const viewport = engine.viewportRef.current;
    let targetX = followTargetX;

    if (viewport) {
      targetX = resolveChaserHorizontalTargetX(
        chaser,
        followTargetX,
        chaser.y,
        viewport.width,
        scrollOffsetY,
        engine.cameraRef.current.offsetX,
        engine.obstacleRef.current.obstacles,
      );
    }

    const isAvoiding = chaser.avoidObstacleId > 0;
    if (!isAvoiding) {
      const followDelta = followTargetX - chaser.x;
      const followDeltaAbs = followDelta < 0 ? -followDelta : followDelta;
      if (followDeltaAbs <= GAME_CONFIG.CHASER_FOLLOW_DEAD_ZONE) {
        targetX = chaser.x;
      }
    }

    const xSmoothing = isAvoiding
      ? GAME_CONFIG.CHASER_AVOIDANCE_SMOOTHING
      : GAME_CONFIG.CHASER_HORIZONTAL_SMOOTHING;

    const xDamp = 1 - Math.exp(-xSmoothing * deltaSeconds);
    let nextX = chaser.x + (targetX - chaser.x) * xDamp;
    if (Math.abs(targetX - nextX) < POSITION_EPSILON) {
      nextX = targetX;
    }

    if (viewport) {
      const minX = GAME_CONFIG.PLAYER_HORIZONTAL_PADDING;
      const maxX =
        viewport.width - GAME_CONFIG.PLAYER_HORIZONTAL_PADDING - GAME_CONFIG.CHASER_WIDTH;
      if (maxX >= minX) {
        if (nextX < minX) {
          nextX = minX;
        } else if (nextX > maxX) {
          nextX = maxX;
        }
      } else {
        nextX = minX;
      }
    }

    chaser.x = nextX;
  }
}
