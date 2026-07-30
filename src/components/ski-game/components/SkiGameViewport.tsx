import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGameLoop } from '../hooks/useGameLoop';
import { useGameViewport } from '../hooks/useGameViewport';
import { useRegisterCoreSystems } from '../hooks/useRegisterCoreSystems';
import { useGameEngineContext } from '../engine/GameEngineContext';
import { PerformanceOverlay } from '../profiling/PerformanceOverlay';
import { CoinRenderer } from '../ui/CoinRenderer';
import { SpeedBoostRenderer } from '../ui/SpeedBoostRenderer';
import { Hud } from '../ui/Hud';
import { ObstacleRenderer } from '../ui/ObstacleRenderer';
import { PauseButton } from '../ui/PauseButton';
import { GameOverOverlay } from '../ui/GameOverOverlay';
import { PauseOverlay } from '../ui/PauseOverlay';
import { PlayerRenderer } from '../ui/PlayerRenderer';
import { ShieldBubbleRenderer } from '../ui/ShieldBubbleRenderer';
import { ShieldPickupRenderer } from '../ui/ShieldPickupRenderer';
import { CollisionBurstRenderer } from '../ui/CollisionBurstRenderer';
import { GameplayFeedbackRenderer } from '../ui/GameplayFeedbackRenderer';
import { ShieldShatterRenderer } from '../ui/ShieldShatterRenderer';
import { ChaserRenderer } from '../ui/ChaserRenderer';
import { SkiTrackRenderer } from '../ui/SkiTrackRenderer';
import { SnowSurfaceRenderer } from '../ui/SnowSurfaceRenderer';
import { TouchControls } from '../ui/TouchControls';
import { WorldRenderer } from '../ui/WorldRenderer';
import { EdgeTreeRenderer } from '../ui/EdgeTreeRenderer';
import { GAME_CONFIG, perfFeatureEnabled } from '../utils/GameConfig';
import { ShieldRockOverlapDebug } from '../utils/shield-rock-overlap-debug';

import { SkiGameBackground } from './SkiGameBackground';

const viewportStyle = StyleSheet.create({
  root: {
    flex: 1,
  },
});

type SkiGameViewportProps = {
  /** Pause Quit → Main Menu (owned by SkiGameRoot). */
  onQuitToMenu?: () => void;
};

export const SkiGameViewport = memo(function SkiGameViewport({
  onQuitToMenu,
}: SkiGameViewportProps) {
  const engine = useGameEngineContext();
  useRegisterCoreSystems(engine);

  const { onLayout, playerSnapshot, viewport, isSimulationReady } = useGameViewport();
  useGameLoop(engine, isSimulationReady);

  const showSnow = perfFeatureEnabled('SNOW_RENDERER');
  const showSkiTrack = perfFeatureEnabled('SKI_TRACK');
  const showChaser = perfFeatureEnabled('CHASER');
  const showObstacles = perfFeatureEnabled('OBSTACLE_RENDERER');
  const showCoins = perfFeatureEnabled('COINS');
  const showParticles = perfFeatureEnabled('PARTICLES');
  const showHud = perfFeatureEnabled('HUD');

  return (
    <View style={viewportStyle.root} onLayout={onLayout}>
      <SkiGameBackground />
      {viewport ? <WorldRenderer viewport={viewport} /> : null}
      {viewport && showSnow ? <SnowSurfaceRenderer viewport={viewport} /> : null}
      {viewport && showSkiTrack ? <SkiTrackRenderer viewport={viewport} /> : null}
      {viewport && GAME_CONFIG.DECORATIVE_TREES_ENABLED ? (
        <EdgeTreeRenderer viewport={viewport} />
      ) : null}
      {playerSnapshot && showChaser ? <ChaserRenderer /> : null}
      {playerSnapshot ? <ShieldBubbleRenderer player={playerSnapshot} /> : null}
      {playerSnapshot ? <PlayerRenderer player={playerSnapshot} /> : null}
      {viewport && showObstacles ? <ObstacleRenderer viewport={viewport} /> : null}
      {viewport && showCoins ? <CoinRenderer viewport={viewport} /> : null}
      {viewport ? <SpeedBoostRenderer viewport={viewport} /> : null}
      {viewport ? <ShieldPickupRenderer viewport={viewport} /> : null}
      {viewport ? <ShieldRockOverlapDebug viewport={viewport} /> : null}
      {viewport && showParticles ? <CollisionBurstRenderer viewport={viewport} /> : null}
      {viewport && showParticles ? <ShieldShatterRenderer viewport={viewport} /> : null}
      {viewport && showParticles ? <GameplayFeedbackRenderer viewport={viewport} /> : null}
      {showHud ? <Hud /> : null}
      <TouchControls />
      <PauseButton />
      <PauseOverlay onQuitPress={onQuitToMenu} />
      <GameOverOverlay />
      {__DEV__ && GAME_CONFIG.PERFORMANCE_PROFILING ? <PerformanceOverlay /> : null}
    </View>
  );
});
