import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGameLoop } from '../hooks/useGameLoop';
import { useGameViewport } from '../hooks/useGameViewport';
import { useRegisterCoreSystems } from '../hooks/useRegisterCoreSystems';
import { useGameEngineContext } from '../engine/GameEngineContext';
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
import { SnowTrailRenderer } from '../ui/SnowTrailRenderer';
import { TouchControls } from '../ui/TouchControls';
import { WorldRenderer } from '../ui/WorldRenderer';
import { EdgeTreeRenderer } from '../ui/EdgeTreeRenderer';
import { GAME_CONFIG } from '../utils/GameConfig';
import { ShieldRockOverlapDebug } from '../utils/shield-rock-overlap-debug';

import { SkiGameBackground } from './SkiGameBackground';

const viewportStyle = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export const SkiGameViewport = memo(function SkiGameViewport() {
  const engine = useGameEngineContext();
  useRegisterCoreSystems(engine);

  const { onLayout, playerSnapshot, viewport, isSimulationReady } = useGameViewport();
  useGameLoop(engine, isSimulationReady);

  return (
    <View style={viewportStyle.root} onLayout={onLayout}>
      <SkiGameBackground />
      {viewport ? <WorldRenderer viewport={viewport} /> : null}
      {viewport && GAME_CONFIG.DECORATIVE_TREES_ENABLED ? (
        <EdgeTreeRenderer viewport={viewport} />
      ) : null}
      {viewport ? <ObstacleRenderer viewport={viewport} /> : null}
      {viewport ? <CoinRenderer viewport={viewport} /> : null}
      {viewport ? <SpeedBoostRenderer viewport={viewport} /> : null}
      {viewport ? <ShieldPickupRenderer viewport={viewport} /> : null}
      {viewport ? <ShieldRockOverlapDebug viewport={viewport} /> : null}
      {viewport ? <SnowTrailRenderer viewport={viewport} /> : null}
      {viewport ? <CollisionBurstRenderer viewport={viewport} /> : null}
      {viewport ? <ShieldShatterRenderer viewport={viewport} /> : null}
      <ChaserRenderer />
      {playerSnapshot ? <ShieldBubbleRenderer player={playerSnapshot} /> : null}
      {playerSnapshot ? <PlayerRenderer player={playerSnapshot} /> : null}
      {viewport ? <GameplayFeedbackRenderer viewport={viewport} /> : null}
      <Hud />
      <TouchControls />
      <PauseButton />
      <PauseOverlay />
      <GameOverOverlay />
    </View>
  );
});
