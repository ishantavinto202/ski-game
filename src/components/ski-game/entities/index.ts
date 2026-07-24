export { Player, createPlayerForViewport, type PlayerSnapshot } from './Player';
export {
  createInitialChaserState,
  resetChaserState,
  resolveChaserHealthTargetGap,
  resolveChaserFinalTargetGap,
  resolveChaserEdgeToEdgeGap,
  snapChaserBehindPlayer,
  type ChaserState,
} from './Chaser';
export { clearChaserAvoidanceState, resolveChaserHorizontalTargetX } from './ChaserAvoidance';
export {
  createChaserPathState,
  recordChaserPathSample,
  resetChaserPathState,
  resolveChaserWorldY,
  resolvePathFollowX,
  resolvePlayerWorldY,
  type ChaserPathState,
} from './ChaserPath';
export {
  createCoinPoolState,
  activateCoinFromSpawn,
  deactivateCoin,
  collectCoin,
  coinWorldToScreenRect,
} from './Coin';
export {
  createShieldPoolState,
  activateShieldFromSpawn,
  deactivateShield,
  collectShieldPickup,
  shieldWorldToScreenRect,
  tickShieldDuration,
} from './Shield';
export { requestStartGame, requestPauseGame, requestResumeGame, requestGameOver } from './GameState';
export { resetGame } from './restart';
export {
  createSpeedBoostPoolState,
  activateSpeedBoostFromSpawn,
  deactivateSpeedBoost,
  collectSpeedBoostPickup,
  speedBoostWorldToScreenRect,
  tickSpeedBoostDuration,
  resolveScrollSpeedMultiplier,
} from './SpeedBoost';
export {
  createObstaclePoolState,
  createInactiveObstacleRecord,
  findInactiveObstacleSlot,
  activateObstacleFromSpawn,
  deactivateObstacle,
  pickWeightedObstacleVariant,
} from './Obstacle';
