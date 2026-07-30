import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCollisionBurstPool } from '../effects/CollisionBurst';
import { getShieldShatterPool } from '../effects/ShieldShatter';
import { getChaserSkiTrackState, getSkiTrackState } from '../effects/SkiTrack';
import { useGameEngineContext } from '../engine/GameEngineContext';
import {
  buildPerformanceReportMarkdown,
  collectPerformanceReportData,
  getStaticViewCapacityEstimates,
  isPerformanceProfilingEnabled,
  profileSetOverlaySnapshot,
  resetPerformanceProfiler,
  type PerformanceOverlaySnapshot,
} from '../profiling/PerformanceProfiling';
import { GAME_CONFIG, listDisabledPerfIsolationFeatures } from '../utils/GameConfig';

const OVERLAY_TICK_MS = 250;

function countActiveParticles(particles: readonly { active: boolean }[]): number {
  let count = 0;
  for (let index = 0; index < particles.length; index += 1) {
    if (particles[index].active) {
      count += 1;
    }
  }
  return count;
}

/**
 * __DEV__-only FPS / bottleneck overlay. Parent must gate on PERFORMANCE_PROFILING.
 * Production builds never mount this component.
 */
export const PerformanceOverlay = memo(function PerformanceOverlay() {
  const engine = useGameEngineContext();
  const [visible, setVisible] = useState(true);
  const [snapshot, setSnapshot] = useState<PerformanceOverlaySnapshot | null>(null);
  const disabledIsolation = listDisabledPerfIsolationFeatures();
  const isolationLabel =
    disabledIsolation.length > 0 ? `OFF ${disabledIsolation.join(' · ')}` : 'ISO all ON';

  useEffect(() => {
    if (!isPerformanceProfilingEnabled()) {
      return;
    }

    const tick = () => {
      const data = collectPerformanceReportData();
      const burst = getCollisionBurstPool(engine);
      const shatter = getShieldShatterPool(engine);
      const activeParticles =
        countActiveParticles(burst.particles) + countActiveParticles(shatter.particles);
      const activeSkiSegments =
        getSkiTrackState(engine).activeSegmentCount +
        getChaserSkiTrackState(engine).activeSegmentCount;

      const maxPool =
        GAME_CONFIG.MAX_OBSTACLES +
        GAME_CONFIG.MAX_SNOW_SURFACE_DETAILS +
        GAME_CONFIG.MAX_COINS +
        GAME_CONFIG.MAX_SHIELDS +
        GAME_CONFIG.MAX_SPEED_BOOSTS;
      const activePool =
        engine.obstacleRef.current.activeCount +
        engine.snowSurfaceRef.current.activeCount +
        engine.coinRef.current.activeCount +
        engine.shieldRef.current.activeCount +
        engine.speedBoostRef.current.activeCount;
      const poolUsagePct = maxPool > 0 ? (activePool / maxPool) * 100 : 0;

      const next: PerformanceOverlaySnapshot = {
        fps: data.avgFps,
        frameMs: data.avgFrameMs,
        jsUpdateMs: data.gameEngineFixedAvgMs,
        renderSyncMs: data.renderSyncAvgMs,
        onFrameListeners: data.frameListeners + data.playingFrameListeners,
        playingFrameListeners: data.playingFrameListeners,
        sharedWritesPerFrame: data.sharedWritesPerFrame,
        sharedSkipsPerFrame: data.sharedSkipsPerFrame,
        activeObstacles: engine.obstacleRef.current.activeCount,
        activeSnow: engine.snowSurfaceRef.current.activeCount,
        activeCoins: engine.coinRef.current.activeCount,
        activeShields: engine.shieldRef.current.activeCount,
        activeSpeedBoosts: engine.speedBoostRef.current.activeCount,
        activeParticles,
        activeSkiSegments,
        poolUsagePct,
        gameState: engine.gameStateRef.current.currentState,
      };

      profileSetOverlaySnapshot(next);
      setSnapshot(next);
    };

    tick();
    const id = setInterval(tick, OVERLAY_TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [engine]);

  const onToggle = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const onDump = useCallback(() => {
    const data = collectPerformanceReportData();
    const markdown = buildPerformanceReportMarkdown(
      data,
      getStaticViewCapacityEstimates(GAME_CONFIG),
    );
    console.log(markdown);
  }, []);

  const onReset = useCallback(() => {
    resetPerformanceProfiler();
  }, []);

  if (!__DEV__ || !isPerformanceProfilingEnabled()) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Pressable onPress={onToggle} style={styles.toggle}>
        <Text style={styles.toggleText}>{visible ? 'Hide PERF' : 'Show PERF'}</Text>
      </Pressable>
      {visible && snapshot ? (
        <View style={styles.panel}>
          <Text style={styles.line}>FPS {snapshot.fps.toFixed(1)}</Text>
          <Text style={styles.line}>Frame {snapshot.frameMs.toFixed(2)} ms</Text>
          <Text style={styles.line}>JS fixed {snapshot.jsUpdateMs.toFixed(2)} ms</Text>
          <Text style={styles.line}>Render sync {snapshot.renderSyncMs.toFixed(2)} ms</Text>
          <Text style={styles.line}>
            onFrame {snapshot.onFrameListeners} (play {snapshot.playingFrameListeners})
          </Text>
          <Text style={styles.line}>
            SV writes/f {snapshot.sharedWritesPerFrame} · skip/f {snapshot.sharedSkipsPerFrame}
          </Text>
          <Text style={styles.line}>
            Obst {snapshot.activeObstacles} · Snow {snapshot.activeSnow} · Part{' '}
            {snapshot.activeParticles}
          </Text>
          <Text style={styles.line}>
            Mem pool {snapshot.poolUsagePct.toFixed(0)}% · {snapshot.gameState}
          </Text>
          <Text style={styles.iso}>{isolationLabel}</Text>
          <View style={styles.row}>
            <Pressable onPress={onDump} style={styles.action}>
              <Text style={styles.actionText}>Dump</Text>
            </Pressable>
            <Pressable onPress={onReset} style={styles.action}>
              <Text style={styles.actionText}>Reset</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 48,
    left: 8,
    zIndex: 9999,
  },
  toggle: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleText: {
    color: '#7CFFB2',
    fontSize: 11,
    fontFamily: 'Courier',
  },
  panel: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 200,
  },
  line: {
    color: '#E8FFE8',
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 14,
  },
  iso: {
    color: '#FFB86C',
    fontSize: 10,
    fontFamily: 'Courier',
    lineHeight: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  action: {
    backgroundColor: 'rgba(124,255,178,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  actionText: {
    color: '#7CFFB2',
    fontSize: 11,
    fontFamily: 'Courier',
  },
});
