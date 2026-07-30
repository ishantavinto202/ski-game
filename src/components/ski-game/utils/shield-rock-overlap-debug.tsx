import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { shieldWorldToScreenRect } from '../entities/Shield';
import { requestPauseGame } from '../entities/GameState';
import type { ViewportSize } from '../engine/GameEngine';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { GAME_CONFIG } from '../utils/GameConfig';
import { obstacleWorldToScreenRect } from '../utils/obstacle-render';

/** One-shot: pause and draw collider rects when shield pickup overlaps small_rock. */
export const SHIELD_ROCK_OVERLAP_DEBUG_ENABLED = false;

type ColliderOverlay = {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
};

type OverlapCapture = {
  frame: number;
  shield: ColliderOverlay;
  rock: ColliderOverlay;
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});

function colliderFromRender(
  left: number,
  top: number,
  width: number,
  height: number,
  padding: number,
  color: string,
): ColliderOverlay {
  return {
    left: left + padding,
    top: top + padding,
    width: width - padding * 2,
    height: height - padding * 2,
    color,
  };
}

function renderOverlap(a: ColliderOverlay, b: ColliderOverlay): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

type ShieldRockOverlapDebugProps = {
  viewport: ViewportSize;
};

export const ShieldRockOverlapDebug = memo(function ShieldRockOverlapDebug({
  viewport,
}: ShieldRockOverlapDebugProps) {
  const engine = useGameEngineContext();
  const [capture, setCapture] = useState<OverlapCapture | null>(null);

  useEffect(() => {
    if (!SHIELD_ROCK_OVERLAP_DEBUG_ENABLED || capture) {
      return;
    }

    let frame = 0;
    return engine.onPlayingFrame(() => {
      if (capture) {
        return;
      }
      frame += 1;

      const scrollOffsetY = engine.worldRef.current.scrollOffsetY;
      const cameraOffsetX = engine.cameraRef.current.offsetX;
      const shields = engine.shieldRef.current.shields;
      const obstacles = engine.obstacleRef.current.obstacles;

      for (let si = 0; si < shields.length; si += 1) {
        const shield = shields[si];
        if (!shield.active) {
          continue;
        }
        const shieldRender = shieldWorldToScreenRect(shield, scrollOffsetY, cameraOffsetX);
        const shieldColl = colliderFromRender(
          shieldRender.left,
          shieldRender.top,
          shieldRender.width,
          shieldRender.height,
          GAME_CONFIG.SHIELD_COLLISION_PADDING,
          '#06B6D4',
        );

        for (let oi = 0; oi < obstacles.length; oi += 1) {
          const rock = obstacles[oi];
          if (!rock.active || rock.variant !== 'small_rock') {
            continue;
          }
          const rockRender = obstacleWorldToScreenRect(rock, scrollOffsetY, cameraOffsetX);
          const rockColl = colliderFromRender(
            rockRender.left,
            rockRender.top,
            rockRender.width,
            rockRender.height,
            GAME_CONFIG.OBSTACLE_COLLISION_PADDING,
            '#EF4444',
          );

          if (!renderOverlap(shieldColl, rockColl)) {
            continue;
          }

          const payload: OverlapCapture = { frame, shield: shieldColl, rock: rockColl };
          setCapture(payload);
          requestPauseGame(engine);
          console.log('[SHIELD/ROCK OVERLAP DEBUG] paused', payload);
          return;
        }
      }
    });
  }, [capture, engine, viewport]);

  if (!capture) {
    return null;
  }
  const shieldBoxStyle = [
    styles.box,
    {
      left: capture.shield.left,
      top: capture.shield.top,
      width: capture.shield.width,
      height: capture.shield.height,
      borderColor: capture.shield.color,
    },
  ];
  const rockBoxStyle = [
    styles.box,
    {
      left: capture.rock.left,
      top: capture.rock.top,
      width: capture.rock.width,
      height: capture.rock.height,
      borderColor: capture.rock.color,
    },
  ];

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={shieldBoxStyle} />
      <View style={rockBoxStyle} />
    </View>
  );
});
