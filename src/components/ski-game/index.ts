export { SkiGameScreen } from './screens';
export { SkiGameRoot, SkiGameBackground, SkiGameViewport } from './components';
export { GameEngine, GameLoop, GameEngineProvider, useGameEngineContext, type ViewportSize } from './engine';
export { gameManager, GameManager, SpawnManager, SPAWN_MANAGER_ID } from './managers';
export { useGameEngine, useRegisterCoreSystems, useGameViewport, useGameLoop } from './hooks';
export { useSkiGameStore, type SkiGameStore } from './stores';
export { Player, createPlayerForViewport, type PlayerSnapshot } from './entities';
export {
  PlayerSystem,
  PLAYER_SYSTEM_ID,
  GameStateSystem,
  GAME_STATE_SYSTEM_ID,
  TimeSystem,
  TIME_SYSTEM_ID,
  DifficultySystem,
  DIFFICULTY_SYSTEM_ID,
  WorldSystem,
  WORLD_SYSTEM_ID,
  InputSystem,
  INPUT_SYSTEM_ID,
  MovementSystem,
  MOVEMENT_SYSTEM_ID,
  PlayerFeelSystem,
  PLAYER_FEEL_SYSTEM_ID,
  CameraSystem,
  CAMERA_SYSTEM_ID,
  ObstacleSystem,
  OBSTACLE_SYSTEM_ID,
  CollisionSystem,
  COLLISION_SYSTEM_ID,
  HealthSystem,
  HEALTH_SYSTEM_ID,
  CoinSystem,
  COIN_SYSTEM_ID,
  ShieldSystem,
  SHIELD_SYSTEM_ID,
  SpeedBoostSystem,
  SPEED_BOOST_SYSTEM_ID,
  ChaserSystem,
  CHASER_SYSTEM_ID,
  GameOverSystem,
  GAME_OVER_SYSTEM_ID,
  RestartSystem,
  RESTART_SYSTEM_ID,
  SnowSurfaceSystem,
  SNOW_SURFACE_SYSTEM_ID,
} from './systems';
export {
  createObstaclePoolState,
  activateObstacleFromSpawn,
  deactivateObstacle,
} from './entities';
export {
  createCoinPoolState,
  collectCoin,
} from './entities';
export { createShieldPoolState, collectShieldPickup } from './entities';
export { createSpeedBoostPoolState, collectSpeedBoostPickup } from './entities';
export {
  requestStartGame,
  requestPauseGame,
  requestResumeGame,
  requestGameOver,
  resetGame,
} from './entities';
export { playAgain } from './systems/RestartSystem';
export { PlayerRenderer, WorldRenderer, TouchControls, ObstacleRenderer, CoinRenderer, SpeedBoostRenderer, ShieldPickupRenderer, SkiTrackRenderer, SnowSurfaceRenderer, CollisionBurstRenderer, ShieldShatterRenderer, ChaserRenderer, ShieldBubbleRenderer, Hud, PauseButton, PauseOverlay, GameOverOverlay, ScoringGuideOverlay } from './ui';
export type { PauseOverlayProps, PauseQuitHandler, GameOverOverlayProps, GameOverActionHandler, ScoringGuideOverlayProps } from './ui';
export type {
  GameSystem,
  EngineRef,
  TimeState,
  DifficultyState,
  GameFlowState,
  GameStateRefState,
  PendingGameTransition,
  WorldState,
  InputState,
  InputActions,
  MovementState,
  PlayerFeelState,
  CameraState,
  SpawnKind,
  SpawnRequest,
  SpawnManagerState,
  ObstacleVariant,
  ObstacleRecord,
  ObstaclePoolState,
  CollisionState,
  HealthState,
  ChaserState,
  CoinRecord,
  CoinPoolState,
  ShieldRecord,
  ShieldPoolState,
  SpeedBoostRecord,
  SpeedBoostPoolState,
  SnowSurfaceRecord,
  SnowSurfacePoolState,
} from './types';
export {
  SKI_GAME_COLORS,
  GAME_CONFIG,
  type GameConfig,
  worldYToScreenY,
  screenYToWorldY,
  spawnWorldYAboveViewport,
  spawnLookAheadOffsetPx,
  viewportBottomWorldY,
  lookAheadScreenHeightPx,
  minSafeLaneWidthPx,
  maxObstaclePatternWidthPx,
  isSteerLeftNormalizedX,
  isSteerRightNormalizedX,
  screenXToNormalized,
  clearPendingSpawnRequests,
  aabbIntersectsWithPadding,
} from './utils';
