import type { GameEngine } from '../engine/GameEngine';
import { createInitialCameraState } from '../types/camera-state';
import type { GameSystem } from '../types';
import { GAME_CONFIG } from '../utils/GameConfig';

export const CAMERA_SYSTEM_ID = 'camera-system';

const CAMERA_OFFSET_EPSILON = 0.05;

export class CameraSystem implements GameSystem {
  readonly id = CAMERA_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.cameraRef.current = createInitialCameraState();
  }

  unmount(): void {
    if (this.engine) {
      this.engine.cameraRef.current = createInitialCameraState();
    }
    this.engine = null;
  }

  fixedUpdate(fixedDeltaMs: number): void {
    const engine = this.engine;
    if (!engine) {
      return;
    }

    const player = engine.playerRef.current;
    const viewport = engine.viewportRef.current;
    if (!player || !viewport) {
      return;
    }

    const deltaSeconds = fixedDeltaMs / 1000;
    const camera = engine.cameraRef.current;

    const {
      CAMERA_HORIZONTAL_FOLLOW,
      CAMERA_SMOOTHING,
      CAMERA_MAX_OFFSET,
    } = GAME_CONFIG;

    const playerCenterX = player.x + player.width * 0.5;
    const viewportCenterX = viewport.width * 0.5;
    const centerDeltaX = playerCenterX - viewportCenterX;

    let targetOffsetX = centerDeltaX * CAMERA_HORIZONTAL_FOLLOW;

    if (targetOffsetX > CAMERA_MAX_OFFSET) {
      targetOffsetX = CAMERA_MAX_OFFSET;
    } else if (targetOffsetX < -CAMERA_MAX_OFFSET) {
      targetOffsetX = -CAMERA_MAX_OFFSET;
    }

    const dampFactor = 1 - Math.exp(-CAMERA_SMOOTHING * deltaSeconds);
    let nextOffsetX = camera.offsetX + (targetOffsetX - camera.offsetX) * dampFactor;

    if (nextOffsetX > CAMERA_MAX_OFFSET) {
      nextOffsetX = CAMERA_MAX_OFFSET;
    } else if (nextOffsetX < -CAMERA_MAX_OFFSET) {
      nextOffsetX = -CAMERA_MAX_OFFSET;
    }

    if (Math.abs(nextOffsetX) < CAMERA_OFFSET_EPSILON && Math.abs(targetOffsetX) < CAMERA_OFFSET_EPSILON) {
      camera.offsetX = 0;
      return;
    }

    camera.offsetX = nextOffsetX;
  }
}
