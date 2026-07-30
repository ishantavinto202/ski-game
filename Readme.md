# Getting Started

This project is built using Expo, React Native, Expo Router, and NativeWind.

## Requirements

Before starting, make sure you have installed:

- Node.js (LTS version recommended)
- npm
- Xcode (for iOS development on Mac)
- Android Studio (for Android development)
- Expo Go app on your phone (optional)

---

# Project Setup

## 1. Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

---

## 2. Start the Development Server

Run:

```bash
npx expo start
```

This will open the Expo developer tools.

---

# Running the App

## iPhone Simulator

Press:

```bash
i
```

inside the terminal after Expo starts.

You can also open directly from Xcode simulator.

---

## Android Emulator

Press:

```bash
a
```

inside the terminal after Expo starts.

Make sure Android Emulator is already running.

---

## Physical Device

1. Install the Expo Go app
2. Scan the QR code shown in terminal/browser
3. The app will open on your device

---

# Native Build Setup (Outside Expo Go)

This project supports running a full native app build using:

```bash
npx expo run:ios
```

or

```bash
npx expo run:android
```

This creates the native iOS and Android folders automatically.

Use this when:
- Testing native modules
- Using custom native code
- Running libraries that do not work in Expo Go
- Debugging native behavior

---

## First Time Native Setup

### Generate Native Folders

```bash
npx expo prebuild
```

---

## Run iOS App

```bash
npx expo run:ios
```

---

## Run Android App

```bash
npx expo run:android
```

---

# Important Notes About Native Builds

After native folders are created:

```txt
ios/
android/
```

the project becomes a development build workflow instead of pure Expo Go workflow.

If package changes affect native code, run:

```bash
npx expo prebuild
```

again.

---

# Project Structure

```txt
app/            Main application screens and routes
components/     Reusable UI components
assets/         Images, fonts, icons
constants/      Static values and configs
hooks/          Custom React hooks
src/
  components/
    ski-game/   Ski Game module (see below)
```

---

# Ski Game Architecture

The Ski Game lives under `src/components/ski-game/` as a self-contained module. It is designed for **portrait** play: a tall viewport with vertical world scroll (top → bottom), a low-centered player, and a large look-ahead band above the skier for upcoming obstacles.

## Portrait orientation

| Area | Change |
|------|--------|
| `app.json` | `"orientation": "portrait"` locks the app to portrait |
| `app/_layout.tsx` | `SafeAreaProvider` for inset-aware layout |
| `screens/SkiGameScreen.tsx` | Full-screen `flex: 1` root (snow background); safe areas via HUD / pause / overlays only |
| `utils/GameConfig.ts` | Reference size `390 × 844`, player Y band, look-ahead, steer/obstacle ratios |
| Runtime viewport | **SkiGameViewport** `onLayout` → live width/height (fills screen; reference size is config-only) |

**Reference viewport (`390 × 844`):** Used only to tune normalized constants and document layout intent. All spawn math uses the live `engine.viewportRef` from layout.

**Camera / scroll:** Unchanged — world scroll is still vertical (`worldRef.scrollOffsetY` increases downward). In portrait, the player sits at ~82% of viewport height (`PLAYER_START_Y`, default `0.82`), with `PLAYER_LOOKAHEAD_RATIO` documenting the lower band below the anchor. Use `LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO` and `spawnLookAheadOffsetPx()` when placing upstream content.

**Controls:** **TouchControls** + **InputSystem** capture touch in invisible left/right half-screen zones (`STEER_ZONE_DIVIDER_X`). Read `engine.inputRef.current.leftPressed` / `rightPressed` from simulation.

**Obstacle layout:** Patterns respect `OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO` and `OBSTACLE_MAX_PATTERN_WIDTH_RATIO`, computed via `minSafeLaneWidthPx()` / `maxObstaclePatternWidthPx()` from the live viewport width.

**HUD (portrait):** Hearts, score, and distance top-left; **ActiveEffectDurationHud** top-center (⚡ speed + 🛡 shield bars while active); **PauseButton** top-right (safe area). Metrics sync from engine refs through `engine.onPlayingFrame` and Reanimated shared values only.

## Folder layout

```txt
src/components/ski-game/
  assets/       Game-specific images, sprites, and audio
  components/   Core layout pieces (root shell, background)
  engine/       GameEngine, GameLoop, context, and system registry
  entities/     Entity definitions (Player, etc.)
  hooks/        React hooks tied to the engine lifecycle
  managers/     Session-level coordinators (GameManager)
  screens/      Full-screen entry points (SkiGameScreen)
  services/     Side effects and external integrations (future)
  stores/       Zustand state (use selectors only)
  systems/      GameSystem implementations (PlayerSystem, etc.)
  types/        Shared TypeScript types
  ui/           HUD, overlays, and entity/world renderers
  utils/        Constants and helpers (GameConfig, colors)
  index.ts      Public exports for the module
```

## Runtime composition

1. **SkiGameScreen** — Full-screen **SkiGameRoot** (`flex: 1`, snow background); gameplay viewport is not inset — safe areas apply to HUD / pause / overlays only.
2. **SkiGameRoot** — Creates a **GameEngine** via `useGameEngine`. Cold launch shows **MainMenu** (`SNOW DASH` / Play / Quit) over **SkiGameBackground** — **SkiGameViewport** is not mounted. **PLAY GAME** switches to the gameplay session (provider + **SkiGameViewport**); when systems mount at `ready`, Root requests `requestStartGame` once. **QUIT GAME** is a placeholder no-op. **Pause → Quit** calls `resetGame` then returns to Main Menu (`phase = menu`, unmounts viewport). Optional `children` still render. **Play Again** still uses `playAgain(engine)` after `resetGame` (does not return to the menu).
3. **SkiGameViewport** — Registers core systems (through **SpawnManager**), starts **GameLoop** after layout, and mounts renderers, **Hud**, **TouchControls**, and pause UI. Layout and spawn use one-time React updates only.
4. **GameManager** — Owns the active engine instance for the current session (`createEngine` / `destroyEngine`).
5. **GameEngine** — Holds mutable **refs** (including `spawnRef`, `obstacleRef`), `inputActionsRef`, `runFixedUpdate`, frame listeners, viewport notifications, and **GameSystem** registration.
6. **GameLoop** — `requestAnimationFrame` driver with a fixed timestep accumulator (`FIXED_TIMESTEP`, 60 FPS target). Runs gameplay fixed steps only while `gameStateRef.currentState === 'playing'`; catch-up is capped at four fixed steps so a delayed frame cannot create an eight-step CPU spike. It always calls `runGameStateFixedUpdate` when idle/paused/game over, then `engine.notifyFrame` every frame so transition UI stays live.
7. **useGameEngineContext** — Access the engine from nested components without prop drilling.

## Game state

High-level flow on `engine.gameStateRef` — main menu + pause UI; game over / restart covered in later sections.

| File | Role |
|------|------|
| `types/GameStateTypes.ts` | `GameFlowState`, `GameStateRefState`, `PendingGameTransition` |
| `entities/GameState.ts` | Transition requests, `applyPendingGameTransition`, `isGameplaySimulationActive` |
| `systems/GameStateSystem.ts` | Sole owner of `currentState` / `previousState` updates |
| `ui/MainMenu.tsx` | Cold-launch menu — `assets/TYPOGRAPHY.png` logo + filled Play / outlined Quit |

**Ref fields:** `currentState`, `previousState`, `pendingTransition`.

**States:** `menu`, `ready`, `playing`, `paused`, `game_over` (cold initial: `menu`).

**Request API (sets `pendingTransition` only — never mutates `currentState` directly):**

- `requestStartGame(engine)`
- `requestPauseGame(engine)`
- `requestResumeGame(engine)`
- `requestGameOver(engine)`

**Valid transitions (invalid requests are cleared and ignored):**

```mermaid
stateDiagram-v2
  [*] --> menu
  menu --> ready: gameplay systems mount / resetGame
  ready --> playing: start
  playing --> paused: pause
  paused --> playing: resume
  playing --> game_over: game_over
```

**Transition ownership:** Only **GameStateSystem** applies transitions via `applyPendingGameTransition` during its `fixedUpdate`. Gameplay systems must not assign `currentState`; they call the request helpers when needed (**GameOverSystem** → `requestGameOver` when health reaches 0 while `playing`).

**Initial boot:** Engine cold-starts at `menu`. **SkiGameRoot** shows **MainMenu** without mounting **SkiGameViewport** (no GameLoop / gameplay renderers). **PLAY GAME** mounts the viewport; **GameStateSystem.mount** enters `ready`, then Root requests `ready → playing`. **resetGame** / Play Again restore `ready` (not `menu`) via `createReadyGameStateRefState`. **GameLoop** starts only when `isSimulationReady` (`viewport !== null && playerSnapshot !== null`) so simulation never runs before the measured viewport and player spawn exist — and never while the main menu is showing. **ChaserRenderer** / **PlayerRenderer** mount only after `playerSnapshot` is set; shared values start at `opacity = 0` and become visible only after the first valid engine sync.

**Update flow (each animation frame):**

1. **GameLoop** `onFrame` — if `playing`, drain the bounded fixed timestep accumulator with `engine.runFixedUpdate` (maximum four steps; each step runs **GameStateSystem** first, then all other systems). If not `playing`, call `engine.runGameStateFixedUpdate(0)` once and reset the accumulator (no simulation catch-up while idle/paused/game over).
2. **GameStateSystem** — consume `pendingTransition`, update `previousState` / `currentState` when valid.
3. **GameEngine.runFixedUpdate** — after game state step, return early unless `currentState === 'playing'`; otherwise run remaining systems in registration order.
4. **notifyFrame** — always runs; renderers and HUD keep syncing from refs regardless of state.

**Registration order:** **GameStateSystem** is registered first (before **TimeSystem**).

```ts
const { currentState, previousState, pendingTransition } = engine.gameStateRef.current;
```

No allocations during **GameStateSystem** `fixedUpdate`.

## Pause

Pause control and overlay — reads `gameStateRef` only; transitions go through `requestPauseGame` / `requestResumeGame`.

| File | Role |
|------|------|
| `ui/PauseTypes.ts` | Flow index constants, overlay props, placeholder quit handler |
| `ui/PauseButton.tsx` | Top-right control while `playing` → `requestPauseGame` |
| `ui/PauseOverlay.tsx` | Semi-transparent scrim + panel while `paused`; Resume → Scoring Guide → Quit |
| `ui/ScoringGuideOverlay.tsx` | Floating snow/navy modal (matches Pause / Game Over); scrollable collectibles + obstacles guide |
| `ui/ScoringGuideRow.tsx` | Compact guide rows with real asset thumbnails |
| `ui/scoring-guide-data.ts` | Config-driven guide copy/effects from `GAME_CONFIG` / `score-consequences` (UI presentation only) |

**Pause button**

- Safe-area top-right (`PauseButton`).
- Visible (`display: flex`) only when `currentState === 'playing'` via Reanimated shared value synced on `engine.onFrame`.
- Does not mutate refs except through `requestPauseGame(engine)`.

**Pause overlay**

- Visible only when `currentState === 'paused'`.
- Gameplay + **Hud** stay rendered underneath; world is frozen because **GameLoop** skips gameplay fixed steps while not `playing`.
- **Resume** → `requestResumeGame(engine)`.
- **Quit** → optional `onQuitPress` prop (defaults to `PAUSE_PLACEHOLDER_QUIT`, no navigation yet).
- **Scoring Guide** action opens **ScoringGuideOverlay** above the pause panel; closing the guide returns to pause (`currentState` stays `paused`).
- Blocks touches above **TouchControls** while shown (`zIndex` above steer zones).

**Viewport layer order (bottom → top):**

1. **WorldRenderer** → **SnowSurfaceRenderer** → **SkiTrackRenderer** → **ChaserRenderer** → **ShieldBubbleRenderer** → **PlayerRenderer** → **ObstacleRenderer** → **CoinRenderer** → **SpeedBoostRenderer** → **ShieldPickupRenderer** → **CollisionBurstRenderer** → **ShieldShatterRenderer**
2. **Hud**
3. **TouchControls**
4. **PauseButton** (playing only)
5. **PauseOverlay** (paused only)
6. **GameOverOverlay** (game over only; above pause — see **Game over**)

No React state for gameplay; no animations, audio, or haptics.

## Game over

Detects zero health during play and shows a summary overlay.

| File | Role |
|------|------|
| `systems/GameOverSystem.ts` | If `playing` and `healthRef.currentHealth <= 0` → cache summary on `gameOverCacheRef`, then `requestGameOver(engine)` |
| `ui/GameOverTypes.ts` | Overlay props, summary/cache helpers, quit placeholder |
| `ui/GameOverOverlay.tsx` | Visible when `game_over`; transition listener captures stats once into Reanimated values; Play Again → Scoring Guide → Quit |

**Gameplay rule:** **GameOverSystem** never assigns `gameStateRef.currentState`; only **GameStateSystem** applies `game_over` from `pendingTransition`.

**Overlay (read-only refs):** `scoreRef`, `timeRef`, `coinRef`, `healthRef` via `readGameOverSummaryFromRefs`. **Play Again** default → `playAgain(engine)` (**Restart**). **Scoring Guide** opens **ScoringGuideOverlay**. **Quit** → optional prop (placeholder no-op).

## Scoring Guide

Informational overlay only — no gameplay / scoring mechanic changes. Snow/navy panel language matches Pause / Game Over (not a separate dark theme). Values come from `COIN_COLLECT_SCORE`, `OBSTACLE_CONSEQUENCES`, `SHIELD_DURATION_MS`, `SPEED_BOOST_*`. Collectible/booster thumbnails use `assets/voxel assets/` (Coin, Sheld Guide, Blue_Thunder_Asset) — guide-only; in-game pickup atlases are unchanged. Collectible rows use compact benefit chips (`+N SCORE`, `1 HIT` / `N SEC`, `N× SPEED` / `N SEC`) in the same chip language as obstacle penalty chips, with green / shield-teal / boost-blue tones. Obstacle thumbnails reuse `obstacle-assets` metadata for object-centered previews (`GuideAssetLayout` is UI-only). Obstacle rows show compact red penalty chips (`−N SCORE`, optional `♥ −N`) instead of loose effect text.

**`engine.gameOverCacheRef`:** snapshot written at game over; cleared by `resetGame`.

**Full viewport layer order (bottom → top):**

1. **WorldRenderer**
2. **SnowSurfaceRenderer** (sparse snow imperfections)
3. **SkiTrackRenderer** (carved ski tracks on snow)
4. **ChaserRenderer** (chase-pressure follower; behind shield bubble / player)
5. **ShieldBubbleRenderer** then **PlayerRenderer** (when player mounted; bubble behind skier so the player sits inside the bubble art)
6. **ObstacleRenderer** (above player/chaser so skiers pass visually behind trees/rocks/cabins)
7. **CoinRenderer**
8. **SpeedBoostRenderer**
9. **ShieldPickupRenderer**
10. **CollisionBurstRenderer** / **ShieldShatterRenderer** (impact VFX)
11. **GameplayFeedbackRenderer** (floating score/heart text)
12. **Hud**
13. **TouchControls**
14. **PauseButton**
15. **PauseOverlay**
16. **GameOverOverlay**

While `game_over`, simulation fixed steps stop (same as pause); `notifyFrame` keeps the last frame visible under the overlay.

## Restart

In-place session reset without recreating **GameEngine** or reallocating pool arrays.

| File | Role |
|------|------|
| `entities/restart.ts` | Public `resetGame(engine)` — mutates existing refs and pool slots only |
| `systems/RestartSystem.ts` | Re-exports `resetGame`; `playAgain(engine)` = `resetGame` + `requestStartGame` |

**`resetGame(engine)` order (no allocations):**

1. **Game state** → `ready`, clear `previousState` / `pendingTransition`
2. **Player** → spawn position for current viewport, `velocityX` 0, lean 0, input released
3. **Time** → elapsed, distance, delta, `fixedAccumulatorMs` (see **GameLoop**)
4. **Difficulty** → baseline elapsed, level, multipliers
5. **World / camera** → scroll and offset zero
6. **Health / score / collision** → full health, score 0, no invulnerability; collision cleared
7. **Coins / obstacles / shields / speed boosts** → deactivate every pooled slot in place, `activeCount` 0, reset counters/effects
8. **Spawn manager** → clear pending queue, reset timers/cursors (lane layout preserved)
9. **Game over cache** → cleared

**Play Again:** `GameOverOverlay` calls `playAgain(engine)` when no custom `onPlayAgainPress` is supplied.

**Quit:** still `GAME_OVER_PLACEHOLDER_QUIT` (no navigation).

```ts
import { resetGame, playAgain } from '@/components/ski-game';

resetGame(engine);
requestStartGame(engine); // or playAgain(engine)
```

## World simulation

Simulation state lives in engine refs. React reads layout once; scrolling updates Reanimated shared values on the frame callback.

| File | Role |
|------|------|
| `systems/TimeSystem.ts` | Updates `timeRef`: `elapsedMs`, `deltaMs`, `totalDistance` each fixed step |
| `systems/DifficultySystem.ts` | Advances `difficultyRef` elapsed time and linear ramp multipliers (before scroll/spawn consumers) |
| `systems/WorldSystem.ts` | Increments `worldRef.scrollOffsetY` at `BASE_SCROLL_SPEED` × `difficultyRef.speedMultiplier` × speed-boost multiplier |
| `engine/GameLoop.ts` | Fixed timestep loop (cap on catch-up steps) |
| `hooks/useGameLoop.ts` | Starts/stops the loop when the viewport is ready |
| `ui/WorldRenderer.tsx` | Tiled snow strip; vertical `translateY` from scroll; horizontal `translateX` from `cameraRef` via shared values + `engine.onPlayingFrame` |
| `utils/world-coordinates.ts` | `worldYToScreenY` (`scrollOffsetY - worldY`), spawn ahead via `scrollOffsetY + offset`, despawn/render helpers |

**GameConfig:** `BASE_SCROLL_SPEED`, `FIXED_TIMESTEP`, `DIFFICULTY_RAMP_DURATION_MS`, `MAX_DIFFICULTY_SPEED_MULTIPLIER`, `MIN_SPAWN_INTERVAL_MULTIPLIER`, plus portrait tuning (`REFERENCE_VIEWPORT_*`, `LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO`, `PLAYER_LOOKAHEAD_RATIO`, steer/obstacle ratios — see **Portrait orientation**).

**Registration order:** **GameStateSystem** → `TimeSystem` → **DifficultySystem** → `WorldSystem` → `InputSystem` → `PlayerSystem` → `MovementSystem` → `PlayerFeelSystem` → `CameraSystem` → **SpawnManager** → **ObstacleSystem** → **SnowSurfaceSystem** → **CollisionSystem** → **HealthSystem** → **GameOverSystem** → **CoinSystem** → **ShieldSystem** → **SpeedBoostSystem** → **ChaserSystem** → **SkiTrackSystem** (gameplay systems run in `runFixedUpdate` when `playing`).

**Vertical scroll:** **WorldSystem** drives `worldRef.scrollOffsetY` using difficulty and optional speed boost (see **Speed boost**). **SpawnManager** uses `difficultyRef.spawnIntervalMultiplier` for pickup timing only; obstacle density is lookahead-driven (see **Lookahead population**). **TimeSystem** distance still uses base speed only. Look-ahead ratios and spawn helpers are unchanged.

## Snow surface details (visual)

Sparse procedural snow imperfections on top of the base snow strip — **presentation only**; no collision, spawn patterns, or gameplay coupling.

| File | Role |
|------|------|
| `utils/snow-surface-assets.ts` | Static `require()` for six transparent PNGs + base display sizes |
| `types/SnowSurfaceTypes.ts` | Fixed pool record + fill cursor / RNG state |
| `entities/SnowSurface.ts` | Pool create / activate / deactivate / reset + world→screen |
| `systems/SnowSurfaceSystem.ts` | Sparse lookahead fill + despawn below viewport |
| `ui/SnowSurfaceRenderer.tsx` | Fixed `MAX_SNOW_SURFACE_DETAILS` slots; Reanimated images (no flip/rotate) |

**Assets** (`assets/bg asset/`): `Snow Depression .png` (space before `.png`), `Snow Depression Small.png`, `Snow Dimples.png`, `Snow Ridge Short.png`, `Snow Ridge.png`. **`Snow Mound.png` is not used** (too obstacle-like). Lighting baked for east/right sun — never mirrored.

**Behavior:**

1. Fixed pool of **`MAX_SNOW_SURFACE_DETAILS` (24)**; recycle slots when past the bottom margin.
2. Weighted spawn: large depression **3**, small depression **28**, dimples **30**, short ridge **27**, long ridge **12** (sum 100).
3. Per-asset scale (large depression **0.60–0.72**, long ridge **0.70–0.90**, others ~**0.70–1.00**); global opacity **`0.72`**.
4. Irregular vertical spacing **`70–150`** px (no nearby-pair clusters); uniform random X across the playable width.
5. Cosmetic obstacle exclusion: placement padding **`24`**, runtime cull padding **`12`**, up to **`6`** X retries; skip activate if none clear.
6. Layer: **above WorldRenderer**, **below SkiTrackRenderer** / characters / obstacles.
7. **`resetSnowSurfacePoolInPlace`** on Play Again / restart.

**GameConfig (snow surface):** `MAX_SNOW_SURFACE_DETAILS`, `SNOW_SURFACE_OPACITY`, `SNOW_SURFACE_SCALE_*`, `SNOW_SURFACE_PLACEMENT_OBSTACLE_PADDING`, `SNOW_SURFACE_RUNTIME_OBSTACLE_PADDING`, `SNOW_SURFACE_MAX_PLACEMENT_ATTEMPTS`, `SNOW_SURFACE_SPACING_*`, `SNOW_SURFACE_HORIZONTAL_PADDING`, `SNOW_SURFACE_INITIAL_LEAD`, `SNOW_SURFACE_LOOKAHEAD`, `SNOW_SURFACE_DESPAWN_MARGIN`, `SNOW_SURFACE_RENDER_MARGIN`.

## Difficulty

Time-based ramp stored on `engine.difficultyRef` — no UI, rendering, or changes to pickup/obstacle spawn consumers beyond reading multipliers.

| File | Role |
|------|------|
| `types/DifficultyTypes.ts` | `DifficultyState`, `createInitialDifficultyState`, `syncDifficultyFromElapsed` |
| `systems/DifficultySystem.ts` | Adds `fixedDeltaMs` to `elapsedTimeMs`, recomputes multipliers each fixed step |

**GameConfig (difficulty):**

| Key | Default | Meaning |
|-----|---------|---------|
| `DIFFICULTY_RAMP_DURATION_MS` | `180000` | Linear ramp duration from baseline to caps (3 min) |
| `MAX_DIFFICULTY_SPEED_MULTIPLIER` | `1.6` | Max scroll multiplier from difficulty alone |
| `MIN_SPAWN_INTERVAL_MULTIPLIER` | `0.55` | Min interval multiplier at max difficulty (shorter interval → more spawns) |

**`engine.difficultyRef`:** `elapsedTimeMs`, `currentLevel` (1–10 steps over the ramp), `speedMultiplier`, `spawnIntervalMultiplier`.

**Progression (linear, no jumps):**

Let `t = clamp(elapsedTimeMs / DIFFICULTY_RAMP_DURATION_MS, 0, 1)`.

- `speedMultiplier = 1 + t × (MAX_DIFFICULTY_SPEED_MULTIPLIER − 1)`
- `spawnIntervalMultiplier = 1 + t × (MIN_SPAWN_INTERVAL_MULTIPLIER − 1)`
- `currentLevel` = discrete step 1…10 from `t` (10 at full ramp)

**Pause (future UI):** `requestPauseGame` / `requestResumeGame` drive `playing` ↔ `paused`; fixed simulation and difficulty progression stop while not `playing` because **GameLoop** skips gameplay fixed steps.

**WorldSystem:**  
`scrollStep = BASE_SCROLL_SPEED × difficulty.speedMultiplier × resolveScrollSpeedMultiplier(speedBoostRef) × fixedDeltaMs / 1000`

**SpawnManager:**  
Each fixed step, **`maintainSpawnPopulationAhead`** appends **SpawnPattern** origins upstream until `nextPatternOriginY` reaches the lookahead frontier (see **Lookahead population**). Pickups still use `effectiveSpawnInterval = SPAWN_INTERVAL × difficulty.spawnIntervalMultiplier`.

```ts
const { elapsedTimeMs, currentLevel, speedMultiplier, spawnIntervalMultiplier } =
  engine.difficultyRef.current;
```

No allocations during `fixedUpdate` in **DifficultySystem**.

## Camera

Subtle horizontal follow only; no change to vertical scroll or look-ahead layout above the player.

| File | Role |
|------|------|
| `systems/CameraSystem.ts` | Target offset from player vs viewport center; smooth `cameraRef.offsetX` |
| `types/camera-state.ts` | `CameraState` on `engine.cameraRef` |
| `ui/WorldRenderer.tsx` | Applies `-offsetX` on the world strip; extra horizontal margin (`CAMERA_MAX_OFFSET`) prevents empty edges |

**GameConfig (camera):**

| Key | Default | Meaning |
|-----|---------|---------|
| `CAMERA_HORIZONTAL_FOLLOW` | `0.35` | Fraction of player-center delta applied to camera |
| `CAMERA_SMOOTHING` | `9` | Exponential damping rate toward target offset |
| `CAMERA_MAX_OFFSET` | `48` | Max ±offset (px); world width = viewport + 2× margin |

**Behavior:** Target `offsetX = (playerCenterX - viewportCenterX) × CAMERA_HORIZONTAL_FOLLOW`, clamped to ±`CAMERA_MAX_OFFSET`. Smoothed each fixed step. World strip is wider than the viewport by `2 × CAMERA_MAX_OFFSET` so panning never reveals void. Player screen position and vertical scroll are unchanged. No React state; no allocations in `fixedUpdate`.

## Spawn manager

World-space spawn **requests** only — no entities, rendering, or collision. State lives on `engine.spawnRef`.

| File | Role |
|------|------|
| `managers/SpawnManager.ts` | `GameSystem`: density maintenance + pickup interval into a pre-allocated buffer |
| `managers/SpawnPatterns.ts` | Handcrafted **SpawnPattern** library (data-only) |
| `types/SpawnTypes.ts` | `SpawnKind`, `SpawnRequest`, `SpawnManagerState`, lane/buffer helpers |
| `types/SpawnPatternTypes.ts` | `PatternObstacle`, `SpawnPattern` |
| `utils/spawn-patterns.ts` | Weighted pattern pick, lane/world placement, buffer writes (no alloc) |
| `utils/spawn-population.ts` | Lookahead density count + pattern placement (no alloc) |
| `utils/spawn-validation.ts` | Shared spawn footprints + occupancy checks (pool + pending obstacles) |
| `utils/edge-tree-spawn.ts` | Continuous decorative edge trees (no **SpawnRequest**) |
| `utils/spawn-requests.ts` | `clearPendingSpawnRequests()` for reset |
| `utils/spawn-request-intake.ts` | Stale spawn drop, retain-on-failed-activation, and **clone-on-compact** so pending slots never alias the same object |

**GameConfig (spawn):**

| Key | Default | Meaning |
|-----|---------|---------|
| `SPAWN_INTERVAL` | `1200` | Ms between pickup rotation ticks (`kindCursor` on `SPAWN_KIND_SEQUENCE`) |
| `SPAWN_LOOKAHEAD_DISTANCE` | `600` | World Y lead for initial population cursor (pickups use `POPULATION_LOOKAHEAD`) |
| `PLAYABLE_WORLD_PADDING` | `16` | Horizontal inset for lane layout and spawn X |
| `POPULATION_LOOKAHEAD` | `900` | Extend sequential pattern generation until `nextPatternOriginY` reaches this lead above scroll top |
| `MIN_FORWARD_DENSITY` | `10` | Reserved for future density tuning (sequential fill uses the frontier cursor today) |
| `PATTERN_VERTICAL_SPACING_MIN` / `MAX` | `160` / `320` | Random gap (px) after each pattern’s depth before the next origin (~50% fewer patterns vs prior tuning) |
| `PATTERN_READABILITY_GAP` | `48` | Minimum clear world Y between the previous pattern’s top and the next pattern’s trailing edge |
| `MAX_PATTERNS_PER_FIXED_STEP` | `3` | Cap on pattern appends per simulation step |
| `SPAWN_VALIDATION_PATTERN_MAX_RETRIES` | `3` | Upstream origin bumps when a pattern footprint is occupied |
| `OBSTACLE_PASSAGE_SAFETY_MARGIN` | `14` | Added to player collision width for minimum horizontal passable gap between footprints |
| `OBSTACLE_VERTICAL_SAFETY_MARGIN` | `12` | Added to player collision height for minimum vertical passable gap between footprints |
| `OBSTACLE_EDGE_OPEN_GROUP_LIMIT_EARLY` / `MID` / `LATE` | `3` / `2` / `1` | Consecutive groups an edge corridor may stay unpressured before a staggered edge-pressure formation |
| `EDGE_PRESSURE_MIN_INWARD_CLEARANCE` | `58` | Min inward player-center displacement (px) required for an accepted edge-pressure formation |
| `EDGE_PRESSURE_MIN_COOLDOWN_GROUPS` | `2` | Groups after pressure before another forced formation (critical overdue can bypass) |
| `MAX_OBSTACLE_PLACEMENT_ATTEMPTS` | `4` | Deterministic lane/X corrections per pattern obstacle before skip |
| `DEBUG_OBSTACLE_SPACING` | `false` | Log rejected/repositioned obstacle spawn candidates (dev only) |
| `SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS` | `288` | Hard cap on occupancy probes per pickup placement search |
| `SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS` | `36` | Upstream Y bands scanned from pickup base Y (× retry step) |
| `SPAWN_PICKUP_WORLD_Y_RETRY_STEP` | `36` | World Y offset between pickup placement bands |
| `PICKUP_MIN_VERTICAL_SEPARATION` | `64` | Min \|ΔworldY\| between pickup centers (pending + active) |
| `EDGE_TREE_CLUSTER_SIZE_MIN` / `MAX` | `2` / `4` | Trees per decorative edge cluster (each side) |
| `EDGE_TREE_IN_CLUSTER_SPACING_MIN` / `MAX` | `88` / `124` | Vertical spacing between trees inside a cluster |
| `EDGE_TREE_CLUSTER_GAP_MIN` / `MAX` | `320` / `560` | Open slope (px) after a cluster before the next cluster |
| `DECORATIVE_TREES_ENABLED` | `false` | Master switch: spawn/update/render decorative edge trees (set `true` to re-enable) |
| `EDGE_TREE_MARGIN` | `20` | Gap outside playable corridor (`spawnRef` lane layout) to decorative tree centers |
| `MAX_DECORATIVE_TREES` | `128` | Decorative tree pool (no collision) |
| `MAX_PENDING_SPAWN_REQUESTS` | `72` | Pre-allocated spawn buffer slots |

**Lanes:** Recomputed on viewport layout from playable width (`viewport − 2× padding`) and `OBSTACLE_MIN_SAFE_LANE_WIDTH_RATIO` (3–8 lanes). Pickup kinds use `elapsedSinceLastSpawnMs` + `kindCursor` on `SPAWN_KIND_SEQUENCE` (`obstacle` → `coin` → `obstacle` → `shield` → `obstacle` → `coin` → `obstacle` → `speed_boost`). Each pickup kind (including **speed_boost**) gets its own turn — no coin→boost piggyback. Obstacles come from population maintenance. Each fixed step, **pickup rotation runs before lookahead population** so pickup validation does not treat same-frame obstacle queue rows as occupied.

**Spawn intake:** **ObstacleSystem**, **CoinSystem**, **ShieldSystem**, and **SpeedBoostSystem** remove a **SpawnRequest** from `pending` only after pool activation succeeds. Failed activations stay queued for retry; **`utils/spawn-request-intake.ts`** drops requests whose world Y is already past the below-viewport despawn line (stale / invalid). When compacting the pending buffer, systems **clone** rows into the write index (instead of copying object references) so a later pickup enqueue cannot overwrite an earlier pending coin via shared slot objects.

### Lookahead population (gameplay obstacles)

Every fixed step while lanes are valid, **SpawnManager** extends the mountain **sequentially** — patterns are never inserted at random Y inside terrain that already exists.

1. **`nextPatternOriginY`** on `spawnRef` is the next upstream pattern origin (initialized at `scrollOffsetY + SPAWN_LOOKAHEAD_DISTANCE` on first run / reset).
2. **Lookahead frontier** = `scrollOffsetY + POPULATION_LOOKAHEAD`.
3. While `nextPatternOriginY < frontier`, pick a weighted **SpawnPattern** (up to **`MAX_PATTERN_SELECTION_ATTEMPTS` (5)** fresh weighted picks if placement fails — not the same pattern retried), map one of five conceptual horizontal bands (left edge / left / center / right / right edge) onto the live lane layout, and expand at **`nextPatternOriginY`** (bumped upward if needed so the next pattern’s vertical range does not overlap the previous pattern’s range).
4. Advance the cursor by **pattern depth** (max `forwardOffset` in that pattern, computed at runtime) plus a random gap in `PATTERN_VERTICAL_SPACING_MIN` … `MAX`.
5. Cap patterns per tick so a single step cannot exhaust the buffer; resume on the next tick if the pending queue is full.
6. Every fourth pattern is forced to **`single_rock`** in a randomly selected horizontal band. Successful groups update bounded `leftEdgeOpenGroups` / `rightEdgeOpenGroups` from whether the accepted formation meaningfully interrupts that edge corridor (not mere outer-lane overlap). Once an edge reaches its difficulty-scaled open limit (early `3`, mid `2`, late `1`), the next eligible group places a staggered **edge-pressure formation** (early: tree + rock; mid: tree + boulder; late: tree + boulder + stump) anchored on that outer lane. Acceptance requires ≥ `EDGE_PRESSURE_MIN_INWARD_CLEARANCE` inward displacement and an interior escape band. `edgePressureCooldownRemaining` / `lastEdgePressureSide` prevent back-to-back pressure spam (and prefer alternating sides when both edges are due). Never reads player X. Reset clears counters, cooldown, and last side.

**Spawn validation:** Before any pattern or pickup is queued, **`spawn-validation.ts`** builds a **`SpawnFootprint`** (lanes + world X/Y from existing geometry — pattern entries use **`OBSTACLE_VARIANT_DIMENSIONS`**, not duplicated metadata). **Obstacle patterns:** **`findClearPatternOriginY`** accepts an origin only when **`isSpawnAreaOccupied`** is false (active **`obstacleRef`** slots and pending **`obstacle`** **SpawnRequest** rows) **and** **`isPickupAreaOccupied`** is false (active coin/shield/speed-boost pools plus pending pickup **SpawnRequest** rows, raw footprints — no shield clearance inset). Patterns use validation Y-step retries inside **`findClearPatternOriginY`**; if a pattern still does not fit, **`spawn-population.ts`** discards only that pick and tries another weighted pattern (selection retries). If nothing fits after selection attempts, **`nextPatternOriginY`** advances upstream. **Per-obstacle spacing:** After an origin is chosen, **`enqueueSpawnPatternRequests`** validates each **`PatternObstacle`** with **`utils/obstacle-spacing.ts`** before writing a **SpawnRequest**. Validation uses **`OBSTACLE_VARIANT_DIMENSIONS`** gameplay footprints (not PNG canvas sizes). Minimum passable gaps are derived from the player collision body: horizontal gap ≥ **`PLAYER_WIDTH − 2×PLAYER_COLLISION_PADDING + OBSTACLE_PASSAGE_SAFETY_MARGIN`** (default **50 px**); vertical gap ≥ **`PLAYER_HEIGHT − 2×PLAYER_COLLISION_PADDING + OBSTACLE_VERTICAL_SAFETY_MARGIN`** (default **68 px**) when footprints share horizontal overlap. Each candidate is checked against active **`obstacleRef`** slots (Y-band cull), pending obstacle **SpawnRequest** rows, and obstacles already accepted in the same pattern expansion. Up to **`MAX_OBSTACLE_PLACEMENT_ATTEMPTS`** deterministic lane shifts (original, ±1 lane, ±2 lane) are tried before that individual obstacle is skipped — the pattern is not cancelled. Set **`DEBUG_OBSTACLE_SPACING`** to log rejections/repositions. **Pickups:** **`findClearPickupSpawn`** scans every lane at the base lookahead Y, then repeats for each upstream Y band (`SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS` × `SPAWN_PICKUP_WORLD_Y_RETRY_STEP`), stopping at the first clear footprint or **`SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS`** probes (still obstacle-safe, lane-bound, never behind the player). Decorative edge trees skip a slot if occupied (no retries). No allocations in **`fixedUpdate`**.

**Temporary cabin debug:** **`utils/cabin-debug.ts`** (`CABIN_DEBUG_ENABLED`) logs `[CABIN]` events for patterns containing a cabin through population, enqueue, **ObstacleSystem**, and **ObstacleRenderer**; **`logCabinDebugSummary()`** runs on game over. Remove when done investigating.

**Temporary force-cabin debug:** **`utils/spawn-debug.ts`** (`DEBUG_FORCE_CABIN`) can place one **`cabin_avoidance`** on the first non-safe population slot per run, then weighted selection resumes. It is `false` by default so production gameplay uses normal weighted selection.

**ObstacleSystem** remains unaware of patterns; it only consumes **SpawnRequest** rows.

### Spawn patterns (data-only library)

Handcrafted **`SpawnPattern`** objects in **`SPAWN_PATTERN_LIBRARY`** (28 patterns) — the only obstacle layout content. Each pattern has **`id`**, **`weight`**, **`difficulty`** (`easy` | `medium` | `hard`), and **`obstacles`** (`variant`, `laneOffset`, `forwardOffset`). Depth-led weaves, gates, S-turns, and chicanes; no full-width walls. **`single_rock`** remains index `0` for periodic safe gaps. Edge pressure uses dedicated staggered formations in **`spawn-population.ts`**. `scripts/verify-edge-safe-lanes.ts` runs 750 deterministic groups at levels 1/5/10 and checks corridor interruption, inward clearance, escape bands, stagger, cooldown spacing, both-side participation, and reset.

Grouped exports for future weighting (unused by spawn pick today): **`SPAWN_PATTERNS_EASY`**, **`SPAWN_PATTERNS_MEDIUM`**, **`SPAWN_PATTERNS_HARD`**, **`SPAWN_PATTERN_DIFFICULTY_WEIGHT_TOTAL`**.

Adding a pattern = append one **`SpawnPattern`** in **`managers/SpawnPatterns.ts`** (no gameplay system changes).

**Pickup scheduling:** **Coin**, **shield**, and **speed_boost** share `SPAWN_INTERVAL` and advance `kindCursor` on `['obstacle','coin','obstacle','shield','obstacle','coin','obstacle','speed_boost']` (obstacle steps advance cadence only). Relative frequency per cycle: **2 coins : 1 shield : 1 speed_boost**. **`kindCursor` always advances after each pickup tick** (even when enqueue fails or the pending buffer is full). Pickup base world Y uses **`max(POPULATION_LOOKAHEAD, nextPatternOriginY)`**. **`findClearPickupSpawn`** validates against **active obstacles** (not pending obstacle queue rows) and rejects Y bands within **`PICKUP_MIN_VERTICAL_SEPARATION`** of pending or active pickups.

**Consumers:** **ObstacleSystem** uses `request.obstacleVariant` when set; otherwise falls back to the pool’s weighted variant picker. Other systems unchanged.

### Decorative edge trees

Disabled by default via **`DECORATIVE_TREES_ENABLED`** in **GameConfig** (set to `true` to re-enable spawn, **DecorativeTreeSystem**, and **EdgeTreeRenderer**).

| File | Role |
|------|------|
| `types/DecorativeTreeTypes.ts` | Non-colliding tree records + pool |
| `entities/DecorativeTree.ts` | Separate pool from gameplay obstacles |
| `systems/DecorativeTreeSystem.ts` | Continuous edge fill ahead + despawn below viewport |
| `ui/EdgeTreeRenderer.tsx` | Frame-synced placeholders (no collision) |

**DecorativeTreeSystem** fills edge trees each fixed step using **`spawnRef`** playable bounds: left center at `playableOriginX − EDGE_TREE_MARGIN − treeWidth/2`, right center at `playableOriginX + laneWidth × laneCount + EDGE_TREE_MARGIN + treeWidth/2`. Trees whose AABB intersect the corridor are skipped. **Clusters** of 2–4 with in-cluster spacing and **`EDGE_TREE_CLUSTER_GAP_*`** between clusters. No **SpawnRequest**, no collision. Fill cursor on `engine.decorativeTreeRef`. **`EdgeTreeRenderer`** draws the pool (opacity 0.85).

**Reading requests:**

```ts
const spawn = engine.spawnRef.current;
for (let i = 0; i < spawn.pendingCount; i += 1) {
  const request = spawn.requests[i];
  // worldX, worldY, kind, laneIndex, obstacleVariant
}
clearPendingSpawnRequests(spawn);
```

No per-frame allocations; slots are reused in a fixed `MAX_PENDING_SPAWN_REQUESTS` (72) buffer.

## Obstacles

Pooled obstacles in world space (**ObstacleSystem**) with separate presentation (**ObstacleRenderer**) and detection (**CollisionSystem**). No health, shield, or game over yet.

| File | Role |
|------|------|
| `types/ObstacleTypes.ts` | `ObstacleVariant`, `ObstacleRecord`, `ObstaclePoolState`, voxel-ready dimensions |
| `entities/Obstacle.ts` | Pool factory, activate/deactivate, weighted variant picker (LCG, no alloc) |
| `systems/ObstacleSystem.ts` | Spawn intake, despawn below viewport, `engine.obstacleRef` lifecycle only |
| `ui/ObstacleRenderer.tsx` | Fixed `MAX_OBSTACLES` memo slots; Reanimated placeholders + PNG assets (no React state) |
| `utils/obstacle-render.ts` | World → screen transform, viewport culling |
| `utils/obstacle-assets.ts` | Static obstacle PNG registry, source metadata, visual layout (render-only) |

**GameConfig (obstacles):**

| Key | Default | Meaning |
|-----|---------|---------|
| `MAX_OBSTACLES` | `64` | Pooled slots (gameplay + render views) |
| `OBSTACLE_DESPAWN_MARGIN` | `48` | Px below viewport bottom before pool reuse |
| `OBSTACLE_RENDER_MARGIN` | `64` | Culling padding around viewport for draw |
| `OBSTACLE_ASSET_SCALE` | `1.45` | Environment obstacle render + collision footprint multiplier (design base × scale) |
| `SMALL_ROCK_SIZE` | `32×28` | Design-base footprint (px); runtime **`46.4×40.6`** |
| `LARGE_BOULDER_SIZE` | `60×54` | Design base; runtime **`87×78.3`** |
| `TREE_SIZE` | `48×72` | Design base; runtime **`69.6×104.4`** |
| `TREE_STUMP_SIZE` | `34×30` | Design base; runtime **`49.3×43.5`** |
| `CABIN_SIZE` | `82×74` | Design base; runtime **`118.9×107.3`** |
| `WOODEN_FENCE_SIZE` | `72×22` | Design base; runtime **`104.4×31.9`** |
| `SMALL_ROCK_SPAWN_WEIGHT` | `40` | Weighted random variant |
| `LARGE_BOULDER_SPAWN_WEIGHT` | `20` | |
| `TREE_SPAWN_WEIGHT` | `15` | |
| `TREE_STUMP_SPAWN_WEIGHT` | `15` | |
| `CABIN_SPAWN_WEIGHT` | `5` | |
| `WOODEN_FENCE_SPAWN_WEIGHT` | `5` | |

**Variants:** `small_rock`, `large_boulder`, `tree`, `tree_stump`, `cabin`, `wooden_fence` — spawn/placement footprints from `OBSTACLE_VARIANT_DIMENSIONS` (= design `*_SIZE` × `OBSTACLE_ASSET_SCALE` `1.45`). **Collision** uses tighter per-asset physical hitboxes (see **Collision**). Player, chaser, and pickups are **not** scaled.

**Obstacle assets (render metadata + environment scale in `utils/obstacle-assets.ts`):**

Three separate bounds:

| Bound | Purpose |
|-------|---------|
| **PNG canvas** | Full artwork incl. transparent padding + cast shadows (`canvasWidth` × `canvasHeight`) |
| **Object body** | Opaque voxel mass inside the PNG (`objectWidth` × `objectHeight`, `objectOffset*`) — anchors visual draw |
| **Physical hitbox** | Gameplay collision only (`collision.widthRatio` etc. within object body) — **shadows never collide** |

Spawn/placement uses scaled design footprints (`OBSTACLE_VARIANT_DIMENSIONS`). Rendering aligns the object body to that rect via `visualOffsetX` / `visualOffsetY`. **`getObstacleCollisionScreenRect`** (`utils/obstacle-collision.ts`) returns the precomputed physical hitbox — **`CollisionSystem`** uses this, not the PNG canvas or gameplay placement rect.

**Placeholder colors** (`utils/colors.ts`, indexed by `OBSTACLE_VARIANT_RENDER_INDEX` — fallback only when artwork missing):

| Variant | Color |
|---------|--------|
| Small rock | Gray `#9CA3AF` |
| Large boulder | Dark gray `#4B5563` |
| Tree | Green `#15803D` |
| Tree stump | Brown `#92400E` |
| Cabin | Red `#DC2626` |
| Wooden fence | Orange `#EA580C` |

| Field | Role |
|-------|------|
| `canvasWidth` / `canvasHeight` | Full PNG canvas (includes shadow/padding) |
| `objectWidth` / `objectHeight` | Physical object bounds inside the PNG |
| `objectOffsetX` / `objectOffsetY` | Object origin within the canvas |
| `renderWidth` / `renderHeight` | Scaled draw size (`scale = gameplayWidth / objectWidth`) |
| `visualOffsetX` / `visualOffsetY` | Screen offset from gameplay rect so object body aligns with placement footprint |
| `collision.*Ratio` | Physical hitbox within object body (per variant / tree visual) |

**Cabin (`assets/obstacles/cabin.png`):**

| | Source px | Gameplay |
|--|-----------|----------|
| PNG canvas | `536×610` | — |
| Object bounds | `455×610` (offset `x=81` — shadow on left) | runtime **`118.9×107.3`** (`82×74` × `1.45`) |
| Scale | `118.9 / 455 ≈ 0.261` | collision uses scaled footprint, not canvas |
| Render size | — | `≈140×159` (full PNG, aspect preserved) |

**Tree (`assets/obstacles/Big Tree (Tree 1).png`, `Medim Tree (Tree 2).png`, `Small Tree (Tree 3).png`):**

Single gameplay variant **`tree`** with **three render-only visual variants** (`treeVisualVariant` `0 | 1 | 2` on `ObstacleRecord`). Assigned **once** in `activateObstacleFromSpawn` via the pool LCG (`rngState % 3` ≈ 33% each). Stable for the slot’s active lifetime — never re-rolled in `ObstacleRenderer`.

| Visual | File | Verified canvas | Verified object bounds (shadow excluded) | Gameplay |
|--------|------|-------------------|------------------------------------------|----------|
| 0 — Big | `Big Tree (Tree 1).png` | **`659×480`** | `327×419` @ offset `(322, 6)` | runtime **`69.6×104.4`** |
| 1 — Medium | `Medim Tree (Tree 2).png` | **`432×377`** | `176×327` @ offset `(251, 0)` | same |
| 2 — Small | `Small Tree (Tree 3).png` | **`395×367`** | `215×358` @ offset `(176, 0)` | same |

Scale per visual: `OBSTACLE_VARIANT_DIMENSIONS.tree.width / objectWidth`. Precomputed layouts in `TREE_VISUAL_LAYOUTS[0..2]`.

**Small rock (`assets/obstacles/Small Rock.png`):**

| | Supplied notes | Verified (repo PNG) | Gameplay |
|--|----------------|---------------------|----------|
| PNG canvas | `163×151` | **`122×113`** | — |
| Object bounds | `135×164` (invalid — height > canvas) | **`100×110`** @ offset `(22, 0)` | runtime **`46.4×40.6`** |
| Scale | — | `46.4 / 100 = 0.464` | collision uses scaled footprint, not canvas |
| Render size | — | `≈56.6×52.4` | aspect preserved |

**Large boulder (`assets/obstacles/Big Rock.png`):**

| | Supplied notes | Verified (repo PNG) | Gameplay |
|--|----------------|---------------------|----------|
| PNG canvas | `432×325` | **`432×325`** ✓ | — |
| Object bounds | `346×292` | **`412×292`** @ offset `(17, 2)` | runtime **`87×78.3`** |
| Scale | — | `87 / 412 ≈ 0.211` | collision uses scaled footprint, not canvas |
| Render size | — | `≈91.2×68.6` | aspect preserved |

**Tree stump (`assets/obstacles/Stump.png`):**

| | Supplied notes | Verified (repo PNG) | Gameplay |
|--|----------------|---------------------|----------|
| PNG canvas | `324×267` | **`243×200`** | — |
| Object bounds | `282×267` | **`209×200`** @ offset `(33, 0)` | runtime **`49.3×43.5`** |
| Scale | — | `49.3 / 209 ≈ 0.236` | collision uses scaled footprint, not canvas |
| Render size | — | `≈57.3×47.2` | aspect preserved |

**Wooden fence (`assets/obstacles/Fence.png`):**

| | Supplied notes | Verified (repo PNG) | Gameplay |
|--|----------------|---------------------|----------|
| PNG canvas | `500×163` | **`375×122`** | — |
| Object bounds | `461×163` | **`344×122`** @ offset `(30, 0)` | runtime **`104.4×31.9`** |
| Scale | — | `104.4 / 344 ≈ 0.303` | collision uses scaled footprint, not canvas |
| Render size | — | `≈113.8×37.0` | aspect preserved |

**Integrated artwork status (all gameplay obstacles):**

| Variant | Artwork |
|---------|---------|
| `small_rock` | PNG |
| `large_boulder` | PNG |
| `tree` | PNG × 3 (randomized visual) |
| `tree_stump` | PNG |
| `cabin` | PNG |
| `wooden_fence` | PNG |

Render sources indexed via `OBSTACLE_RENDER_ASSET_SOURCES`: tree `0..2`, cabin `3`, small rock `4`, large boulder `5`, tree stump `6`, wooden fence `7`. Precomputed layouts: `*_VISUAL_LAYOUT` constants per variant.

All six gameplay obstacle variants now use final PNG artwork — **no obstacle placeholders remain**. Tree visuals `0..2` each carry distinct collision ratios. **`ObstacleSystem`** / **`CollisionSystem`** use physical hitboxes only; shadows and PNG padding are cosmetic.

**Gameplay lifecycle:** SpawnManager → **ObstacleSystem** consumes `obstacle` requests → despawn when past bottom → inactive slots reused (see prior pooling steps).

**Rendering flow:**

1. **SkiGameViewport** layer order: **WorldRenderer** → **SnowSurfaceRenderer** → **SkiTrackRenderer** → **ChaserRenderer** → **ShieldBubbleRenderer** → **PlayerRenderer** → **ObstacleRenderer** → **CoinRenderer** → **SpeedBoostRenderer** → **ShieldPickupRenderer** → **CollisionBurstRenderer** → **ShieldShatterRenderer** → **GameplayFeedbackRenderer** → **Hud** → **TouchControls** → **PauseButton** → **PauseOverlay** → **GameOverOverlay**.
2. One renderer-level `engine.onPlayingFrame` callback updates shared values across fixed slot indices (`obstacleRef.obstacles[i]`); a source change re-renders only that memoized obstacle slot.
3. Screen rect: center-anchored world position minus `worldRef.scrollOffsetY` and `cameraRef.offsetX`.
4. Culled if outside viewport ± `OBSTACLE_RENDER_MARGIN` (`opacity` 0); inactive slots hidden.
5. No component mount/unmount per frame; pool indices map 1:1 to render slots.

```ts
// Screen placement (see obstacleWorldToScreenRect)
left = worldX - width/2 - cameraOffsetX;
top = worldY - height/2 - scrollOffsetY;
```

## Collision

AABB hit tests in **screen space** only — no obstacle removal; damage is applied by **HealthSystem**.

| File | Role |
|------|------|
| `types/CollisionTypes.ts` | `CollisionState` on `engine.collisionRef` |
| `utils/collision.ts` | `aabbIntersectsWithPadding()` |
| `utils/obstacle-collision.ts` | `getObstacleCollisionScreenRect()` — physical hitbox (shadow excluded) |
| `systems/CollisionSystem.ts` | Resets state each fixed step; first hit wins |

**Visual bounds ≠ collision bounds:** PNG canvas and cast shadows are rendered but never tested. Each obstacle asset defines a **physical hitbox** (`ObstacleCollisionMetadata`: `widthRatio`, `heightRatio`, `offsetXRatio`, `offsetYRatio` within the object body). Trees use per-visual collision metadata for randomized Tree 1/2/3. Hitboxes scale with `OBSTACLE_ASSET_SCALE` via the same object-body anchor math as rendering.

**GameConfig (collision):**

| Key | Default | Meaning |
|-----|---------|---------|
| `PLAYER_COLLISION_PADDING` | `4` | Inset on player box (px) |
| `OBSTACLE_COLLISION_PADDING` | `2` | Inset on physical obstacle hitbox (px) |
| `DEBUG_OBSTACLE_HITBOXES` | `false` | When `true`, **ObstacleRenderer** draws translucent red physical hitboxes (tuning only) |

**Flow (each fixed update, after ObstacleSystem):**

1. `resetCollisionState(collisionRef)` → `hasCollision: false`, `obstacleId: 0`, `obstacleType: null`.
2. Player AABB from `playerRef` (screen top-left + size).
3. For each **active** obstacle, physical hitbox via `getObstacleCollisionScreenRect` (gameplay rect + precomputed collision layout; scroll + camera).
4. Test AABB overlap with configurable insets; on first hit set `hasCollision`, `obstacleId`, `obstacleType` and **stop**.
5. Does not mutate player, obstacles, or spawn side effects.

```ts
const { hasCollision, obstacleId, obstacleType } = engine.collisionRef.current;
```

**HealthSystem** consumes `collisionRef` only (not `obstacleRef`).

## Health

Run score and per-variant obstacle consequences on `engine.scoreRef` / `engine.healthRef`. **HealthSystem** runs after **CollisionSystem** and applies centralized values from `utils/score-consequences.ts`. Active shield immunity from `engine.shieldRef` still blocks all obstacle consequences (score + health). Chaser vertical gap follows **health only** (see Chaser section) — obstacle hits do not move the chaser closer.

| File | Role |
|------|------|
| `types/HealthTypes.ts` | `HealthState` (`currentHealth`, `maxHealth`, invulnerability fields) |
| `types/score-state.ts` | `ScoreState` (`currentScore`, `lastDistanceScoreBucket`; score floored at 0) |
| `utils/score-consequences.ts` | `OBSTACLE_CONSEQUENCES`, `COIN_COLLECT_SCORE`, `DISTANCE_METERS_PER_SCORE_POINT`, `applyScoreDelta`, `applyDistanceScoreProgress` |
| `systems/TimeSystem.ts` | Advances distance; awards silent +1 score per `DISTANCE_METERS_PER_SCORE_POINT` (`25`) meters via `scoreRef` |
| `systems/HealthSystem.ts` | Runs after **CollisionSystem**; applies score + damage from `collisionRef` |

**GameConfig (health):**

| Key | Default | Meaning |
|-----|---------|---------|
| `PLAYER_MAX_HEALTH` | `3` | Starting hearts / max health |
| `PLAYER_INVULNERABILITY_MS` | `1200` | I-frames after a damaging hit (ms) |

**Obstacle consequences (`OBSTACLE_CONSEQUENCES`):**

| Variant | Score | Health |
|---------|-------|--------|
| `small_rock` | −15 | 0 |
| `tree_stump` | −20 | 0 |
| `large_boulder` | −30 | −1 |
| `tree` | −25 | −1 |
| `wooden_fence` | −35 | −1 |
| `cabin` | −50 | −2 |

**Consequence flow (each fixed update, after CollisionSystem):**

1. Tick down `invulnerabilityRemainingMs`; set `isInvulnerable` when &gt; 0.
2. If `!collisionRef.hasCollision`, clear `lastDamagingObstacleId` (overlap ended) and exit.
3. If invulnerable, ignore collision (no score or damage).
4. If `collisionRef.obstacleId === lastDamagingObstacleId`, skip (same obstacle still overlapping).
5. If `shieldRef.isShieldActive`, ignore score + damage but still record `lastDamagingObstacleId` and start `PLAYER_INVULNERABILITY_MS`.
6. Otherwise apply `scoreDelta` via `applyScoreDelta` (`Math.max(0, score + delta)`).
7. If `healthDamage > 0`, subtract (clamped), start invulnerability. Score-only hits (0 HP) do **not** start i-frames.
8. Store `lastDamagingObstacleId`.

**Feedback:** While `isInvulnerable`, **PlayerRenderer** alternates opacity 1.0 / 0.35 on a 60 ms / 60 ms square wave derived from `invulnerabilityRemainingMs` (no extra timer).

```ts
const {
  currentHealth,
  maxHealth,
  isInvulnerable,
  invulnerabilityRemainingMs,
} = engine.healthRef.current;
const { currentScore } = engine.scoreRef.current;
```

Internal `lastDamagingObstacleId` prevents multi-tick score or damage from one overlap. After separating from an obstacle, a new overlap can apply consequences again once i-frames allow (or immediately for score-only obstacles).

## Chaser (Version 1)

Health-driven vertical follower behind the skier — **not** a second simulated skier. Three independent responsibilities: **vertical Y** from health, **horizontal X** from player path breadcrumbs, **obstacle safety** via local visual avoidance (horizontal override only).

| File | Role |
|------|------|
| `types/ChaserTypes.ts` | `ChaserState`, `createInitialChaserState`, `resetChaserState` |
| `entities/Chaser.ts` | `resolveChaserHealthTargetGap`, `resolveChaserFinalTargetGap`, `snapChaserBehindPlayer` |
| `entities/ChaserAvoidance.ts` | Local visual obstacle steering (allocation-free scan) |
| `systems/ChaserSystem.ts` | Gap + horizontal smoothing; Speed Boost escape; avoidance integration |
| `ui/ChaserRenderer.tsx` | Recolored skier atlas (`texture_2.png`); shares player atlas frame geometry; Reanimated `onPlayingFrame` sync from `chaserRef` |

**`engine.chaserRef` fields:** `currentGap`, `targetGap`, screen `x` / `y`, `avoidObstacleId`, `avoidDirection`, `lastAvoidDirection`, `path` (fixed-capacity world-space breadcrumb ring buffer).

**Gap semantics:** `currentGap` is **player-top → chaser-top** (px). Visible snow between character bounds = `currentGap − PLAYER_HEIGHT` (player bottom to chaser top). Chaser screen Y = `player.y + currentGap`.

**Intro / Play Again:** `currentGap` starts at `CHASER_PRESSURE_GAP` (`128`) so the chaser is immediately visible. At full health, **targetGap** is `CHASER_SAFE_GAP` (`180`); exponential smoothing (`CHASER_GAP_SMOOTHING` `3.5`) gradually opens the gap without timers or a separate intro state machine.

**Spatial path following (horizontal model):** The Player leaves a **breadcrumb trail** in world space. Each fixed tick records `{ worldY, followX }` into a pre-allocated ring buffer when the Player advances `CHASER_PATH_SAMPLE_SPACING` (`12` px) in world Y (`scrollOffsetY − player.y`). Between samples the newest breadcrumb’s X is refined. The Chaser’s home horizontal target is read from this path at **its own world Y** (`scrollOffsetY − chaser.y`) with linear X interpolation — not live Player X, not elapsed-time delay. `currentGap` controls vertical separation; closer gaps naturally sample earlier points on the same spatial path. Buffer capacity `48` (~576 world px). Resets on Play Again / viewport re-anchor; recording pauses while not `playing`. Speed boost does not break path following — breadcrumbs are spatial, not temporal.

**Local visual obstacle avoidance:** **ChaserSystem** steers with a **Chaser-specific visual avoidance envelope** (not gameplay collision AABBs, not CollisionSystem, not pathfinding). Effective avoidance size is `max(gameplaySize, CHASER_MIN_AVOID_OBSTACLE_*)` — e.g. scaled `small_rock` gameplay `46.4×40.6` becomes avoidance `46.4×48`. Threats use horizontal corridor tests against the **path target** (or imminent overlap at current Chaser X). Effective lookahead = `120 + requiredLateral × 1.75`. Side selection: primary clearance → one-step secondary threat → directional hysteresis (`16` px reversal advantage) → clearance → shorter move from path line.

**Horizontal steering priority:** (1) obstacle safety / avoidance, (2) Player spatial path. When no threat is active, `resolveSafeFollowTargetX` holds current X if returning toward the path would re-enter a nearby envelope. Follow dead zone `10` px; smoothing `5.5` (path) / `8` (avoidance).

Avoidance is visual steering only — no score/health/gap changes, no Chaser gameplay collision.

**Vertical proximity (health only — obstacles do not affect gap):**

| Hearts | Target gap | Config | Visible snow (edge-to-edge) |
|--------|------------|--------|-----------------------------|
| 3 | SAFE | `CHASER_SAFE_GAP` `180` | ~116 px |
| 2 | PRESSURE | `CHASER_PRESSURE_GAP` `128` | ~64 px |
| 1 | DANGER | `CHASER_DANGER_GAP` `96` | ~32 px |

`targetGap = resolveChaserHealthTargetGap(currentHealth)` with defensive clamp `CHASER_MIN_GAP` `80` (not a normal health target). Obstacle hits apply score/health only — **no** chase-pressure accumulation.

**Speed Boost escape:** While `speedBoostRef.isSpeedBoostActive`, **ChaserSystem** adds `CHASER_BOOST_ESCAPE_BONUS` (`90`) to the health target only — does not heal or change score/HP. Opening uses faster smoothing (`CHASER_BOOST_ESCAPE_SMOOTHING` `6`); when boost ends the bonus drops and catch-up uses normal `CHASER_GAP_SMOOTHING` `3.5` (no snap).

**Pause / game over:** Fixed updates skip while not `playing` — chaser freezes with the rest of simulation. **Play Again** snaps `currentGap` to intro (`128`); target follows current health.

**Version 1 limits:** No chaser ↔ obstacle / pickup / player **collision** (visual steering only), no pathfinding / AI, no catch / Game Over from the chaser. Only `currentHealth ≤ 0` ends the run.

**Performance:** Mutable ref state only; no React/Zustand per frame; no allocations in `ChaserSystem.fixedUpdate` or `ChaserAvoidance` (indexed loops, primitive bounds); renderer is `React.memo` + Reanimated shared values.

## Coins

Pooled collectibles — gameplay in **CoinSystem**, visuals in **CoinRenderer** (no audio or collection VFX).

**Investigation archive (symptoms, prompts, fixes, open issues):** [`docs/COIN-PROBLEMS-INVESTIGATION.md`](docs/COIN-PROBLEMS-INVESTIGATION.md).

| File | Role |
|------|------|
| `types/CoinTypes.ts` | `CoinRecord`, `CoinPoolState`, `COIN_WORLD_SIZE` |
| `entities/Coin.ts` | Pool factory, spawn/activate/deactivate/collect helpers, `coinWorldToScreenRect` |
| `systems/CoinSystem.ts` | Spawn intake, AABB collection, despawn, `engine.coinRef` |
| `utils/coin-render.ts` | Viewport culling helpers |
| `ui/CoinRenderer.tsx` | Fixed `MAX_COINS` memo slots; Reanimated atlas sprite (~12 FPS loop from `texture.json` / `texture.png`) |

**GameConfig (coins):**

| Key | Default | Meaning |
|-----|---------|---------|
| `MAX_COINS` | `24` | Pooled slots (gameplay + render views) |
| `COIN_DESPAWN_MARGIN` | `48` | Px below viewport before reuse |
| `COIN_COLLISION_PADDING` | `4` | Inset on coin box for collection |
| `COIN_RENDER_MARGIN` | `64` | Culling padding around viewport for draw |

**`engine.coinRef`:** `coins[]`, `activeCount`, `totalCoinsCollected`, `nextCoinId`.

**Pooling lifecycle (gameplay):**

1. Mount allocates `MAX_COINS` inactive `CoinRecord` entries.
2. Each fixed step: compact `spawnRef` — only `kind === 'coin'` spawns into free slots; other kinds preserved for other systems.
3. World position from spawn request (`worldX`, `worldY` center-anchored for hit/render math). **`resolveCoinActivationWorldY`** re-anchors `worldY` upstream at pool activation if scroll has overtaken the enqueue-time Y so coins enter the viewport band before despawn.
4. **Collection:** Player screen AABB vs coin screen rect (`scroll` + `camera`); uses `PLAYER_COLLISION_PADDING` + `COIN_COLLISION_PADDING`; on hit → `applyScoreDelta(+COIN_COLLECT_SCORE)`, deactivate slot, `totalCoinsCollected += 1`.
5. **Despawn:** When `worldY - scrollOffsetY > viewportHeight + COIN_DESPAWN_MARGIN`, return slot to pool (uncollected).

```ts
const { totalCoinsCollected, activeCount, coins } = engine.coinRef.current;
```

**Rendering flow:**

1. **SkiGameViewport** draws coins **above ObstacleRenderer** and **below PlayerRenderer**.
2. One renderer-level `engine.onPlayingFrame` callback updates shared values per fixed slot index (`coinRef.coins[i]`).
3. Screen rect: `coinWorldToScreenRect` — center-anchored world position minus `worldRef.scrollOffsetY` and `cameraRef.offsetX`.
4. Culled if outside viewport ± `COIN_RENDER_MARGIN` (`opacity` 0); inactive slots hidden.
5. **Atlas animation:** `assets/assets/Coin Animations/texture.png` + `texture.json` (TexturePacker frames sorted **1–24**); clip + translate crop at **~12 FPS** from `timeRef.elapsedMs`; drawn at `COIN_WORLD_SIZE` (28×28 world box).
6. No component mount/unmount per frame; pool indices map 1:1 to render slots.

No allocations during `fixedUpdate` in **CoinSystem**.

## Ski tracks (visual)

Dual continuous ski-carve tracks left in world space for **player and chaser** — **presentation only**; no gameplay systems changes. Same style/config for both.

| File | Role |
|------|------|
| `types/SkiTrackTypes.ts` | Fixed ring-buffer point + segment layout types |
| `effects/SkiTrack.ts` | Shared sampling + layout rebuild; separate fixed buffers for player and chaser |
| `systems/SkiTrackSystem.ts` | Records feet world positions on fixed steps (after **ChaserSystem**) |
| `ui/SkiTrackRenderer.tsx` | Two track layers (player + chaser); fixed segment slots; dual Reanimated capsule strokes |

**Replaced:** bubble/dot **`SnowTrail`** particle pool (`effects/SnowTrail.ts`, `ui/SnowTrailRenderer.tsx`).

**Behavior:**

1. **SkiTrackSystem** samples player and chaser feet into independent preallocated ring buffers every **`SKI_TRACK_SAMPLE_DISTANCE`** world px while `playing`.
2. Points are stored in **world space** (`worldX = screenX + cameraOffsetX`, `worldY = scrollOffsetY − feetScreenY`) so tracks scroll naturally with the mountain.
3. **SkiTrackRenderer** rebuilds up to **`SKI_TRACK_MAX_POINTS − 1`** elongated capsule segments per owner per frame (overlap **`SKI_TRACK_SEGMENT_OVERLAP`**) with perpendicular **`SKI_TRACK_SEPARATION`** for left/right skis.
4. Opacity fades from **`SKI_TRACK_OPACITY_FAR`** (oldest) → **`SKI_TRACK_OPACITY`** (near skier). Oldest points prune below the viewport.
5. Layer: **above SnowSurfaceRenderer** / **WorldRenderer**, **below chaser/player/obstacles/pickups** (both trails share this layer).
6. Restart / Play Again clears both track buffers via **`resetAllSkiTrackStates`**.

**GameConfig (ski tracks):**

| Key | Default | Meaning |
|-----|---------|---------|
| `SKI_TRACK_MAX_POINTS` | `48` | Ring-buffer path history (per owner) |
| `SKI_TRACK_SAMPLE_DISTANCE` | `6` | Min world px between samples |
| `SKI_TRACK_WIDTH` | `4` | Stroke width (px) |
| `SKI_TRACK_SEPARATION` | `12` | Distance between left/right tracks |
| `SKI_TRACK_OPACITY` / `FAR` | `0.38` / `0.15` | Near/far stroke opacity |
| `SKI_TRACK_SEGMENT_OVERLAP` | `2` | Capsule overlap to hide gaps |

No React state per frame; no allocations during sampling or render sync.

## Impact VFX (visual)

Short-lived pooled bursts — **presentation only**; gameplay systems unchanged.

| File | Role |
|------|------|
| `effects/CollisionBurst.ts` | Pool (64), spawn on new obstacle overlap (`collisionRef`), tick + world→screen |
| `effects/GameplayFeedback.ts` | Fixed pool (6), score/heart floaters at player screen position on applied consequences |
| `effects/ShieldShatter.ts` | Pool (64), spawn when shield drops while colliding (post-**ShieldSystem** consume), tick + world→screen |
| `ui/CollisionBurstRenderer.tsx` | Snow kick-up fragments at impact |
| `ui/GameplayFeedbackRenderer.tsx` | Floating `±SCORE` / `−HEART(S)` feedback (Reanimated fade + rise) |
| `ui/ShieldShatterRenderer.tsx` | Cyan shatter fragments at player |

**Collision burst:** Observes `collisionRef.hasCollision` + new `obstacleId` (once per overlap). Spawns **8–12** light snow fragments at player impact; lifetime **250–350 ms**.

**Shield shatter:** Observes `previousShieldActive && !isShieldActive && hasCollision` after fixed updates (shield consumed on hit, not timer-only expiry in normal play). Spawns **10–14** cyan fragments; lifetime **300–400 ms**.

Both use one `engine.onPlayingFrame` tick per renderer (frame delta), Reanimated pooled slots, and `WeakMap` pools per `GameEngine` (same style as **Snow trail**).

## Shield

Pooled shield pickups and timed collision immunity — gameplay in **ShieldSystem**, world pickup visuals in **ShieldPickupRenderer**, active shield bubble in **ShieldBubbleRenderer**, duration bar in **ActiveEffectDurationHud**.

| File | Role |
|------|------|
| `types/ShieldTypes.ts` | `ShieldRecord`, `ShieldPoolState`, `SHIELD_WORLD_SIZE` |
| `entities/Shield.ts` | Pool factory, spawn/deactivate/collect helpers, `activateShieldEffect` / `consumeShieldEffect`, `shieldWorldToScreenRect`, duration tick |
| `systems/ShieldSystem.ts` | Spawn intake, AABB collection, despawn, effect countdown, one-hit consume on obstacle collision, `engine.shieldRef` |
| `utils/shield-render.ts` | Viewport culling helpers |
| `ui/ShieldPickupRenderer.tsx` | Fixed `MAX_SHIELDS` memo slots; Reanimated atlas sprite (~12 FPS loop from `shield-sprite.json` / `shield-sprite.png`) |
| `ui/ShieldBubbleRenderer.tsx` | Active shield art (`shield-bubble.png`) on player while `isShieldActive` (Reanimated pulse + lean) |

**GameConfig (shield):**

| Key | Default | Meaning |
|-----|---------|---------|
| `MAX_SHIELDS` | `12` | Pooled pickup slots (allocated once at mount) |
| `SHIELD_DURATION_MS` | `4000` | Immunity duration after collection (ms); aligned with speed boost |
| `SHIELD_DESPAWN_MARGIN` | `48` | Px below viewport before pickup reuse |
| `SHIELD_COLLISION_PADDING` | `4` | Inset on pickup AABB for collection |
| `SHIELD_RENDER_MARGIN` | `64` | Culling padding around viewport for pickup draw |

**`engine.shieldRef`:** `shields[]`, `activeCount`, `nextShieldId`, `isShieldActive`, `remainingShieldMs`.

**Pooling lifecycle (gameplay):**

1. Mount allocates `MAX_SHIELDS` inactive `ShieldRecord` entries.
2. Each fixed step: compact `spawnRef` — only `kind === 'shield'` spawns into free slots; other kinds preserved.
3. **Collection:** Player screen AABB vs pickup screen rect (`scroll` + `camera`); on hit → deactivate slot, set `isShieldActive = true`, `remainingShieldMs = SHIELD_DURATION_MS`.
4. **Despawn:** When `worldY - scrollOffsetY > viewportHeight + SHIELD_DESPAWN_MARGIN`, return uncollected slot to pool.
5. **Duration:** `tickShieldDuration` each fixed update; when `remainingShieldMs` reaches 0, `consumeShieldEffect` clears the effect.
6. **One-hit absorb:** After **HealthSystem** (same fixed step), if `isShieldActive` and `collisionRef.hasCollision`, **ShieldSystem** calls `consumeShieldEffect`. **HealthSystem** already marked the obstacle and started invulnerability when the shield blocked damage / score / chase pressure, so overlap on later fixed steps does not re-apply consequences.

**Shield pickup rendering:**

1. **SkiGameViewport** draws shield pickups **above SpeedBoostRenderer** and **below PlayerRenderer**. Shield enqueue placement uses full obstacle occupancy (active + pending) plus **`SHIELD_PICKUP_SPAWN_CLEARANCE`** so pickups avoid grey rocks.
2. One renderer-level `engine.onPlayingFrame` callback updates shared values per fixed slot index (`shieldRef.shields[i]`).
3. Screen rect: `shieldWorldToScreenRect` — same center-anchored math as collection in **ShieldSystem**.
4. Culled if outside viewport ± `SHIELD_RENDER_MARGIN` (`opacity` 0); inactive slots hidden.
5. **Atlas animation:** `assets/assets/Shield Animations/shield-sprite.png` + `shield-sprite.json` (TexturePacker frames sorted **1–25** by name, not atlas grid order); clip + translate crop at **~12 FPS** from `timeRef.elapsedMs`; drawn contain-fit inside `SHIELD_WORLD_SIZE` (32×32 world box — gameplay geometry unchanged).

**Shield bubble (presentation):**

1. **ShieldBubbleRenderer** mounts **below** **PlayerRenderer** (`assets/assets/shield-bubble.png`, ~`player.width × 1.9` wide with 400:492 aspect; centered on player screen center; pulse only — no lean).
2. Each playing frame, `engine.onPlayingFrame` reads `shieldRef.isShieldActive`, `playerRef.x`, and `playerFeelRef.leanAngle` (same sync as **PlayerRenderer**).
3. Circle diameter unchanged: **`2 × 1.35 × PLAYER_WIDTH`**, centered on the player placeholder.
4. **Fill** ~40% sky-blue alpha; **4 px** bright border (lighter than fill); optional **outer glow ring** (semi-transparent border, no blur).
5. Breathing pulse: scale **1.00 → 1.08 → 1.00** over **1 s** via `timeRef.elapsedMs` (Reanimated shared values; hidden when inactive).

**Health interaction:** **HealthSystem** checks `shieldRef.isShieldActive` before applying obstacle damage; when the shield blocks a hit it sets `lastDamagingObstacleId` and invulnerability without −1 HP. **ShieldSystem** runs after **HealthSystem** each step and consumes the timed effect on that obstacle collision.

```ts
const { isShieldActive, remainingShieldMs, activeCount, shields } = engine.shieldRef.current;
```

No allocations during `fixedUpdate` in **ShieldSystem**.

## Speed boost

Pooled speed boost pickups and timed scroll multiplier — gameplay in **SpeedBoostSystem**, pickup visuals in **SpeedBoostRenderer**, active effect bars in **ActiveEffectDurationHud** (mounted from **Hud**).

| File | Role |
|------|------|
| `types/SpeedBoostTypes.ts` | `SpeedBoostRecord`, `SpeedBoostPoolState`, `SPEED_BOOST_WORLD_SIZE` |
| `entities/SpeedBoost.ts` | Pool factory, spawn/deactivate/collect helpers, `speedBoostWorldToScreenRect`, duration tick, `resolveScrollSpeedMultiplier` |
| `systems/SpeedBoostSystem.ts` | Spawn intake, AABB collection, despawn, effect countdown, `engine.speedBoostRef` |
| `utils/speed-boost-render.ts` | Viewport culling helpers |
| `ui/SpeedBoostRenderer.tsx` | Fixed `MAX_SPEED_BOOSTS` memo slots; Reanimated atlas sprite (~12 FPS loop from `speed-boost-sprite.json` / `speed-boost-sprite.png`) |
| `ui/ActiveEffectDurationHud.tsx` | Top-center ⚡ speed + 🛡 shield duration bars (see **HUD**) |

**GameConfig (speed boost):**

| Key | Default | Meaning |
|-----|---------|---------|
| `MAX_SPEED_BOOSTS` | `12` | Pooled pickup slots (allocated once at mount) |
| `SPEED_BOOST_DURATION_MS` | `4000` | Boost duration after collection (ms); refreshed on re-collection |
| `SPEED_BOOST_MULTIPLIER` | `1.75` | Applied to `BASE_SCROLL_SPEED` while active |
| `SPEED_BOOST_DESPAWN_MARGIN` | `48` | Px below viewport before pickup reuse |
| `SPEED_BOOST_COLLISION_PADDING` | `4` | Inset on pickup AABB for collection |
| `SPEED_BOOST_RENDER_MARGIN` | `64` | Culling padding around viewport for draw |

**Spawn scheduling:** **SpawnManager** enqueues **`speed_boost`** on its own `SPAWN_KIND_SEQUENCE` turn (independent of coin; shares `SPAWN_INTERVAL ×` difficulty timing). Intake, collection, effect, and despawn are unchanged below.

**`engine.speedBoostRef`:** `speedBoosts[]`, `activeCount`, `nextSpeedBoostId`, `isSpeedBoostActive`, `remainingSpeedBoostMs`, `speedMultiplier` ( `1` when inactive).

**Pooling lifecycle (gameplay):**

1. Mount allocates `MAX_SPEED_BOOSTS` inactive `SpeedBoostRecord` entries.
2. Each fixed step: compact `spawnRef` — only `kind === 'speed_boost'` spawns into free slots; other kinds preserved.
3. **Collection:** Player screen AABB vs pickup screen rect (`scroll` + `camera`); on hit → deactivate slot, set `isSpeedBoostActive = true`, `remainingSpeedBoostMs = SPEED_BOOST_DURATION_MS`, `speedMultiplier = SPEED_BOOST_MULTIPLIER` (refreshes duration if already active).
4. **Despawn:** When `worldY - scrollOffsetY > viewportHeight + SPEED_BOOST_DESPAWN_MARGIN`, return uncollected slot to pool.
5. **Duration:** `tickSpeedBoostDuration` each fixed update; when `remainingSpeedBoostMs` reaches 0, clear effect and set `speedMultiplier = 1`.

**Rendering flow:**

1. **SkiGameViewport** draws speed boost pickups **above CoinRenderer** and **below PlayerRenderer**.
2. One renderer-level `engine.onPlayingFrame` callback updates shared values per fixed slot index (`speedBoostRef.speedBoosts[i]`).
3. Screen rect: `speedBoostWorldToScreenRect` — same center-anchored math as collection in **SpeedBoostSystem**.
4. Culled if outside viewport ± `SPEED_BOOST_RENDER_MARGIN` (`opacity` 0); inactive slots hidden.
5. **Atlas animation:** `assets/assets/Thunder Animations/speed-boost-sprite.png` + `speed-boost-sprite.json` (TexturePacker frames sorted by numeric name; same clip-viewport strategy as **ShieldPickupRenderer**); ~12 FPS from `timeRef.elapsedMs`; contain-fit centered inside `SPEED_BOOST_WORLD_SIZE` (32×32 — gameplay geometry unchanged).

**WorldSystem interaction:** Each fixed step, **WorldSystem** reads `difficultyRef.speedMultiplier` and `resolveScrollSpeedMultiplier(speedBoostRef)`, then scrolls by `(BASE_SCROLL_SPEED × difficulty × boost × fixedDeltaMs) / 1000`. **SpeedBoostSystem** runs later in the same frame (countdown and collection), so a pickup collected mid-frame applies boosted scroll on the **next** fixed step; expiry may apply boost for one extra scroll step on the frame duration hits zero.

```ts
const {
  isSpeedBoostActive,
  remainingSpeedBoostMs,
  speedMultiplier,
  activeCount,
  speedBoosts,
} = engine.speedBoostRef.current;
```

No allocations during `fixedUpdate` in **SpeedBoostSystem**.

## HUD

Read-only overlay for hearts, score, distance, and active speed/shield duration bars — no gameplay mutations, no game over / pause chrome, no collection VFX or particles.

| File | Role |
|------|------|
| `ui/Hud.tsx` | Layout + `engine.onPlayingFrame` → gated Reanimated shared values |
| `ui/ActiveEffectDurationHud.tsx` | Top-center ⚡ speed + 🛡 shield countdown bars |
| `ui/SpeedBoostDurationHud.tsx` | Re-exports **ActiveEffectDurationHud** (compat) |
| `ui/HudStyles.ts` | Minimal styles, inset constants |
| `ui/HudTypes.ts` | `HudMetricValues`, `HudSafeAreaLayout` (documentation / future use) |

**Data flow (each display frame):**

1. **TimeSystem** advances `engine.timeRef.current.totalDistance` (world scroll / run distance) and awards passive distance score on `scoreRef` (+1 per `DISTANCE_METERS_PER_SCORE_POINT` meters; no GameplayFeedback).
2. **HealthSystem** maintains `engine.healthRef.current.currentHealth` and applies obstacle score penalties.
3. **CoinSystem** increments `engine.coinRef.current.totalCoinsCollected` and `engine.scoreRef.current.currentScore` on collection.
4. **Hud** subscribes once via `engine.onPlayingFrame` and copies changed ref fields into shared values (`currentHealth`, `currentScore`, `totalDistance`) — **no React state** for gameplay numbers and no screen-tree timer render.
5. **HudHeart** toggles heart opacity from `currentHealth`; **HudNumberField** uses `useAnimatedProps` on a non-editable `TextInput` for score and distance (`m` suffix).
6. **ActiveEffectDurationHud** mirrors `speedBoostRef` and `shieldRef` (`isSpeedBoostActive` / `remainingSpeedBoostMs`, `isShieldActive` / `remainingShieldMs`) into shared values; fill widths use **GameConfig** durations (no duplicate timers).

**Layout:**

- Safe area: `useSafeAreaInsets()` + `HUD_TOP_OFFSET` / `HUD_HORIZONTAL_INSET`.
- Hearts, score, distance: top-left cluster (`HUD_PAUSE_CLEARANCE` keeps metrics clear of **PauseButton**).
- Active effects: top-center stacked **⚡ SPEED** and **🛡 SHIELD** labels + 160×10 px bars (each hidden when inactive).

**Effect duration bars:**

- Speed bar visible only while `isSpeedBoostActive`; fill = `remainingSpeedBoostMs / SPEED_BOOST_DURATION_MS`.
- Shield bar visible only while `isShieldActive`; fill = `remainingShieldMs / SHIELD_DURATION_MS` (teal fill via `shieldDurationBarFill`).
- Reanimated shared values update in `engine.onPlayingFrame`; cluster `opacity` is 0 when inactive and timer updates never enter React state.

**Viewport layer order (bottom → top):**

1. **WorldRenderer**
2. **SnowSurfaceRenderer**
3. **SkiTrackRenderer**
4. **ChaserRenderer** / **ShieldBubbleRenderer** / **PlayerRenderer**
5. **ObstacleRenderer** (above player/chaser)
6. **CoinRenderer**
7. **Hud**
8. **TouchControls**
9. **PauseButton** / **PauseOverlay** / **GameOverOverlay** (see **Pause**, **Game over**)

`pointerEvents="none"` on the HUD root so touches pass through to **TouchControls** (unless **PauseOverlay** is active).

## Movement

Horizontal player motion only; vertical progress stays on **WorldSystem** scroll. All movement logic lives in **MovementSystem** — **PlayerSystem** spawns only.

| File | Role |
|------|------|
| `systems/MovementSystem.ts` | Reads `inputRef`, updates `movementRef.velocityX` and `playerRef.current.x` each fixed step |
| `types/movement-state.ts` | `MovementState` (`velocityX`) stored on `engine.movementRef` |
| `ui/PlayerRenderer.tsx` | Syncs `left`, steer **lean** (`rotate`), skier **sprite frame**, and damage **blink** (`opacity` square wave from `healthRef` invulnerability) via Reanimated + `engine.onPlayingFrame` (no React state) |

**GameConfig (movement):**

| Key | Default | Meaning |
|-----|---------|---------|
| `PLAYER_MAX_SPEED` | `320` | Horizontal speed cap (px/s) |
| `PLAYER_ACCELERATION` | `1400` | Acceleration while holding steer (px/s²) |
| `PLAYER_DECELERATION` | `1800` | Deceleration when input released (px/s²) |
| `PLAYER_HORIZONTAL_PADDING` | `16` | Inset from viewport left/right when clamping |

**Behavior:** Frame-rate independent integration using `fixedDeltaMs`. Accelerate toward ±`PLAYER_MAX_SPEED` while left/right is held; decelerate to zero when released. Clamp X inside `[padding, viewportWidth - padding - playerWidth]`. Zero allocations in `fixedUpdate`. Visual lean is handled by **PlayerFeelSystem**, not **MovementSystem**.

## Player feel

Steering lean only (no camera, particles, or unrelated animation). **PlayerFeelSystem** runs after **MovementSystem** each fixed step.

| File | Role |
|------|------|
| `systems/PlayerFeelSystem.ts` | Maps `movementRef.velocityX` → target lean; damps `playerFeelRef.leanAngle` |
| `types/player-feel-state.ts` | `PlayerFeelState` (`leanAngle` in degrees) on `engine.playerFeelRef` |
| `ui/PlayerRenderer.tsx` | Applies `rotate` from `playerFeelRef` through a Reanimated shared value |

**GameConfig (feel):**

| Key | Default | Meaning |
|-----|---------|---------|
| `PLAYER_MAX_LEAN_ANGLE` | `14` | Max lean magnitude in degrees |
| `PLAYER_LEAN_SMOOTHING` | `12` | Exponential damping rate toward target lean |

**Behavior:** Target lean = `(velocityX / PLAYER_MAX_SPEED) × PLAYER_MAX_LEAN_ANGLE`, clamped. Current lean approaches target with `1 - exp(-PLAYER_LEAN_SMOOTHING × Δt)`. Returns to neutral as velocity → 0. No React state; no allocations in `fixedUpdate`.

## Input

Touch-only input for portrait steer zones. State lives in **`engine.inputRef`**; **TouchControls** writes via stable **`inputActionsRef`** callbacks — no React state and no per-frame re-renders.

| File | Role |
|------|------|
| `types/InputTypes.ts` | `InputState` (`leftPressed`, `rightPressed`), `InputActions`, `createInitialInputState()` |
| `systems/InputSystem.ts` | Owns input ref, enforces mutual exclusion (never both directions active), exposes actions on mount |
| `ui/TouchControls.tsx` | Invisible left/right `Pressable` overlays sized by `STEER_ZONE_DIVIDER_X` |

**Behavior:**

- Left half (`width = STEER_ZONE_DIVIDER_X × 100%`): `onPressIn` / `onPressOut` → left active.
- Right half: right active; activating one side clears the other.
- Neither pressed when both zones are released.
- Read input via `engine.inputRef.current` — **MovementSystem** drives horizontal motion; **PlayerFeelSystem** drives lean from `movementRef`.

## Player

The player is split across **data** (`entities/Player.ts`), **logic** (`systems/PlayerSystem.ts`), and **rendering** (`ui/PlayerRenderer.tsx`). Screen position is fixed in the viewport layer while **WorldRenderer** scrolls beneath it. Only the initial spawn uses React layout state.

| File | Role |
|------|------|
| `entities/Player.ts` | `Player` model, `PlayerSnapshot`, and `createPlayerForViewport()` |
| `systems/PlayerSystem.ts` | Spawns one player when the viewport is known; stores `Player` on `engine.playerRef` (position X updated by **MovementSystem**) |
| `ui/PlayerRenderer.tsx` | Animated skier atlas (`assets/character sprite/`); lean + damage blink via Reanimated; gameplay AABB unchanged |
| `utils/player-sprite.ts` | Shared skier atlas frame tables (`texture.json`); `PLAYER_ATLAS_TEXTURE` + `CHASER_ATLAS_TEXTURE` (`texture_2.png`) |
| `utils/GameConfig.ts` | Player sizing/spawn, simulation step, portrait reference & layout ratios |

**GameConfig (player):**

| Key | Default | Meaning |
|-----|---------|---------|
| `PLAYER_WIDTH` | `44` | Gameplay / collision width (px) |
| `PLAYER_HEIGHT` | `64` | Gameplay / collision height (px) |
| `PLAYER_VISUAL_WIDTH` | `71` | Skier sprite display width (keeps 304∶273 aspect) |
| `PLAYER_VISUAL_HEIGHT` | `64` | Skier sprite display height |
| `PLAYER_VISUAL_OFFSET_X` / `_Y` | `0` | Render-only center offsets |
| `PLAYER_SPRITE_ANIMATION_FPS` | `12` | Atlas frame rate (driven by `timeRef.elapsedMs`) |
| `DEBUG_PLAYER_HITBOX` | `false` | Optional translucent gameplay AABB overlay |
| `PLAYER_START_X` | `0.5` | Normalized horizontal center (0–1) on the viewport |
| `PLAYER_START_Y` | `0.82` | Normalized vertical center (0–1); ~82% down |
| `PLAYER_LOOKAHEAD_RATIO` | `0.18` | Normalized lower-band / layout tuning below player anchor |
| `REFERENCE_VIEWPORT_WIDTH` | `390` | Design reference only (portrait) |
| `REFERENCE_VIEWPORT_HEIGHT` | `844` | Design reference only (portrait) |
| `LOOK_AHEAD_VIEWPORT_HEIGHT_RATIO` | `0.76` | Upstream look-ahead band (helpers) |
| `SPAWN_LOOKAHEAD_DISTANCE` | `600` | World-space spawn lead (tuned for portrait reference height) |

**Flow:**

1. `useRegisterCoreSystems` registers all core systems including **SpawnManager** and **ObstacleSystem** (after spawn) on **SkiGameViewport** mount.
2. `onLayout` on **SkiGameViewport** (`flex: 1`) → `engine.setViewport(width, height)` and sync React `viewport` state on every size change; player spawn position is re-aligned to the measured viewport (layout hook only).
3. **PlayerSystem** creates one **Player** → `engine.playerRef.current` (mutable ref, not React state).
4. **useGameViewport** syncs **PlayerSnapshot** after `onLayout` + **PlayerSystem** spawn; `isSimulationReady = viewport && playerSnapshot`.
5. **SkiGameViewport** renders gameplay entities only when viewport/player preconditions are met (**ChaserRenderer** / **PlayerRenderer** require `playerSnapshot`; pooled renderers start at `opacity = 0`).
6. **MovementSystem** updates horizontal position; **PlayerFeelSystem** updates lean from velocity.
7. **PlayerRenderer** mirrors `playerRef.current.x`, `playerFeelRef.current.leanAngle`, and skier atlas frame from `timeRef.elapsedMs` (freezes when not `playing`) without `useState`.
8. No camera motion, collision, or per-frame React updates on gameplay state.

## Adding a system (future)

Implement `GameSystem` from `types/game-system.ts` (optional `fixedUpdate` for simulation ticks), then register during bootstrap:

```ts
const engine = useGameEngineContext();
engine.register(mySystem);
```

Unregister or rely on `SkiGameRoot` unmount to call `gameManager.destroyEngine()`, which disposes all registered systems.

## App entry

The root route `app/index.tsx` renders **SkiGameScreen** fullscreen (Stack root, no tab bar or headers).

## Performance conventions

- **SkiGameScreen**, **SkiGameRoot**, **SkiGameViewport**, **SkiGameBackground**, **MainMenu**, **PlayerRenderer**, **SkiTrackRenderer**, **SnowSurfaceRenderer**, **CollisionBurstRenderer**, **ShieldShatterRenderer**, **ShieldPickupRenderer**, **ShieldBubbleRenderer**, **ObstacleRenderer**, **CoinRenderer**, **SpeedBoostRenderer**, **WorldRenderer**, **Hud**, and **TouchControls** are wrapped in `React.memo`.
- Input: **`engine.inputRef`** only — **TouchControls** uses stable `useCallback` handlers; no input `useState`.
- Simulation: no per-frame `useState`; **WorldRenderer** uses Reanimated `useSharedValue` updated from `engine.onPlayingFrame`.
- Styles use `StyleSheet.create` for stable references.
- Zustand: use narrow selectors when state is added; avoid subscribing the full screen tree to high-frequency updates.

---

# Styling

This project uses NativeWind (Tailwind CSS for React Native).

Example:

```tsx
<View className="flex-1 items-center justify-center bg-black">
  <Text className="text-white">Hello</Text>
</View>
```

---

# Routing

This project uses Expo Router.

Every file inside the `app` folder becomes a screen automatically.

Example:

```txt
app/profile.tsx
```

creates:

```txt
/profile
```

---

# Common Commands

## Start Project

```bash
npx expo start
```

---

## Start With Cache Clear

```bash
npx expo start -c
```

---

## Run Native iOS App

```bash
npx expo run:ios
```

---

## Run Native Android App

```bash
npx expo run:android
```

---

## Rebuild Native Folders

```bash
npx expo prebuild
```

---

## Install New Package

```bash
npx expo install package-name
```

---

# Notes

- Use `expo install` instead of `npm install` for React Native / Expo libraries
- Keep package versions compatible with Expo SDK 53
- Avoid upgrading Expo packages individually unless necessary
- Native builds require Xcode or Android Studio properly installed

---

# Troubleshooting

## Metro Issues / Strange Errors

Run:

```bash
npx expo start -c
```

---

## iOS Build Issues

Inside the `ios` folder run:

```bash
pod install
```

or

```bash
npx pod-install
```

---

## Node Modules Problems

Delete dependencies and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

# Recommended VSCode Extensions

- ES7+ React/Redux snippets
- Tailwind CSS IntelliSense
- Prettier
- ESLint

---

# Tech Stack

- Expo SDK 53
- React Native 0.79
- React 19
- Expo Router
- NativeWind
- TypeScript
- Reanimated
- Zustand
- React Query

---

# Phase 3.5 — Runtime Profiling

Instrumentation only (no gameplay/render changes). Enable `GAME_CONFIG.PERFORMANCE_PROFILING`, play ~60s in a **dev** build, tap **Dump** on the PERF overlay, paste the console markdown into `docs/PERFORMANCE-RUNTIME-REPORT.md`.

Details: `docs/PERFORMANCE-PHASE-3.5.md`. The flag is `false` by default; set it back to `false` after every capture.

---

# Performance stabilization — 2026-07-29

## Files added or modified

| Area | Files |
|------|-------|
| Documentation | `Readme.md`; added `docs/PERFORMANCE-AUDIT-PHASE-1.md`, `docs/PERFORMANCE-PHASE-2.md`, `docs/PERFORMANCE-PHASE-3.md`, `docs/PERFORMANCE-PHASE-3.5.md`, `docs/PERFORMANCE-RUNTIME-REPORT.md` |
| Profiling | Added `profiling/PerformanceProfiling.ts`, `profiling/PerformanceOverlay.tsx` |
| Engine/layout | `components/SkiGameViewport.tsx`, `engine/GameEngine.ts`, `engine/GameLoop.ts`, `effects/SkiTrack.ts` |
| Entities/managers | `entities/ChaserAvoidance.ts`, `entities/Coin.ts`, `entities/Obstacle.ts`, `entities/Shield.ts`, `entities/SpeedBoost.ts`, `managers/SpawnManager.ts` |
| Systems | `systems/CameraSystem.ts`, `systems/CoinSystem.ts`, `systems/CollisionSystem.ts`, `systems/HealthSystem.ts`, `systems/ObstacleSystem.ts`, `systems/SnowSurfaceSystem.ts` |
| Render/UI | `ui/ActiveEffectDurationHud.tsx`, `ui/ChaserRenderer.tsx`, `ui/CoinRenderer.tsx`, `ui/CollisionBurstRenderer.tsx`, `ui/EdgeTreeRenderer.tsx`, `ui/GameOverOverlay.tsx`, `ui/GameplayFeedbackRenderer.tsx`, `ui/Hud.tsx`, `ui/MainMenu.tsx`, `ui/ObstacleRenderer.tsx`, `ui/PauseButton.tsx`, `ui/PauseOverlay.tsx`, `ui/PlayerRenderer.tsx`, `ui/ScoringGuideOverlay.tsx`, `ui/ScoringGuideRow.tsx`, `ui/ShieldBubbleRenderer.tsx`, `ui/ShieldPickupRenderer.tsx`, `ui/ShieldShatterRenderer.tsx`, `ui/SkiTrackRenderer.tsx`, `ui/SnowSurfaceRenderer.tsx`, `ui/SpeedBoostRenderer.tsx`, `ui/WorldRenderer.tsx` |
| Utilities | Added `utils/shared-value-write.ts`; modified `utils/GameConfig.ts`, `utils/shield-rock-overlap-debug.tsx`, `utils/spawn-debug.ts`, `utils/spawn-population.ts`, `utils/spawn-validation.ts` |

## Architectural changes

- Kept the existing hierarchy intact. No new provider, gameplay store, screen, system, or renderer layer was introduced.
- `GameEngine` exposes two stable frame channels: `onFrame` for state-transition UI and `onPlayingFrame` for world/entity synchronization. Paused and game-over frames do not fan out through every pooled renderer.
- Each pooled renderer owns one frame listener and updates preallocated SharedValues by slot. Slot elements are memoized; a single obstacle asset or snow type change updates only its memoized slot, never the full world/viewport tree.
- The normal SharedValue writer is selected once at module load. With profiling disabled, hot writes do not call into profiling code.
- Mutable simulation, timers, pools, and input remain on engine refs/SharedValues. Zustand has no gameplay subscription; future use must remain selector-only.

## Gameplay systems implemented or preserved

- Preserved movement, camera, spawn density, collisions, pickups, health, chaser behavior, scoring, effects, pause, restart, and difficulty systems.
- Added conservative early rejection and scratch reuse in chaser avoidance, collision, snow overlap, spawn population, and spawn validation. Search order and accepted gameplay outcomes remain unchanged.
- Fixed-step catch-up is capped at four updates after a delayed frame. This preserves short-stall recovery while preventing one hitch from causing an eight-update CPU burst.
- Disabled the one-shot forced-cabin diagnostic by default; production runs use the authored weighted pattern library.

## Migration progress

- Phase 1 audit: complete.
- Phase 2 render/listener consolidation: complete.
- Phase 3 fixed-update and allocation cleanup: complete.
- Phase 3.5 instrumentation: complete and opt-in. A real-device report remains pending; do not invent FPS numbers.
- Production hardening: profiling defaults off, stable render callbacks/derived elements are in place, timer values bypass React state, and module TypeScript/ESLint checks pass.

## Important implementation notes

- Target is 60 FPS, but final FPS and memory numbers require a release/dev-client capture on target hardware. Static checks cannot certify device frame rate.
- There is no tile board or rendered keyboard in this repository. Their required isolation rule is applied to the equivalent pooled world slots and touch controls: one entity change is slot-local, and touch handlers are stable callbacks backed by mutable input refs.
- Music ask mode: this repository does not contain the referenced `src/components/Mosh-pit/` module or its MP3 bundle. No music files or fabricated sources were added. Add only user-provided/licensed tracks and explicit Metro `require(...)` registrations if that module is later introduced.
- Profiling is for diagnosis only. Set `PERFORMANCE_PROFILING: true` temporarily, capture/dump, then restore `false`.

---

# Runtime stutter and cabin stabilization — 2026-07-30

## Files added or modified

No architecture files were added.

| Area | Files modified |
|------|----------------|
| Documentation | `Readme.md` |
| Engine/effects/types | `engine/GameEngine.ts`, `effects/SkiTrack.ts`, `types/SkiTrackTypes.ts` |
| Spawn gameplay | `managers/SpawnPatterns.ts`, `utils/spawn-patterns.ts`, `utils/spawn-population.ts` |
| Systems | `systems/SnowSurfaceSystem.ts` |
| World renderers | `ui/WorldRenderer.tsx`, `ui/ObstacleRenderer.tsx`, `ui/EdgeTreeRenderer.tsx`, `ui/SnowSurfaceRenderer.tsx`, `ui/CoinRenderer.tsx`, `ui/ShieldPickupRenderer.tsx`, `ui/SpeedBoostRenderer.tsx`, `ui/SkiTrackRenderer.tsx`, `ui/PlayerRenderer.tsx`, `ui/ChaserRenderer.tsx`, `ui/ShieldBubbleRenderer.tsx`, `ui/CollisionBurstRenderer.tsx`, `ui/ShieldShatterRenderer.tsx`, `ui/GameplayFeedbackRenderer.tsx` |
| Timer HUD | `ui/Hud.tsx`, `ui/ActiveEffectDurationHud.tsx` |
| Stable-reference UI | `ui/MainMenu.tsx`, `ui/PauseOverlay.tsx`, `ui/GameOverOverlay.tsx`, `ui/ScoringGuideOverlay.tsx`, `ui/ScoringGuideRow.tsx` |
| Debug utility | `utils/shield-rock-overlap-debug.tsx` |

## Architectural changes

- Preserved the existing engine, system, world-renderer, and memoized slot hierarchy exactly; no provider, store, screen, system, or rendering layer was added.
- Static pooled world entities now retain camera-independent, world-local geometry. Each renderer updates one parent `translateX`/`translateY` transform as the camera moves instead of rewriting every visible slot's position on every display frame.
- Obstacle, coin, shield, and speed-boost geometry is written only when a pool slot receives a new entity ID. Snow geometry is written only when that detail slot's immutable placement changes.
- Decorative edge-tree geometry is written only when a pooled placement changes; camera motion no longer rewrites up to 128 tree rectangles per frame.
- Ski-track segment geometry is rebuilt only when its preallocated point ring revision changes. Ordinary scrolling updates only the track layer transform.
- JSX style combinations are module-stable or memoized, including pooled slots, particle effects, HUD, overlays, player/chaser art, and menus. No inline render style object or array remains in the ski-game module.
- `GameEngine.dispose()` now clears all viewport and frame listeners after systems unmount, preventing retained callbacks across engine lifetimes.

## Gameplay systems implemented

- Cabins use the existing authored `cabin_avoidance` and `cabin_flank_weave` patterns and existing bundled cabin asset.
- A cabin pattern is scheduled at population serial 1 and every 12 population groups thereafter, alternating between both authored formations. A required edge-pressure group may run first, but the cabin serial is retained for the next group.
- Scheduled cabins are persistent across temporary capacity or placement failures. Cabin patterns roll back newly written requests when the cabin itself cannot be placed, so a partial pattern can no longer silently consume the cabin opportunity.
- Snow decoration still avoids obstacle visuals, but the runtime detail-versus-obstacle scan now runs only when a new obstacle generation is activated. Initial placement continues to validate every new detail.
- Movement, collisions, spawn validation, authored pattern geometry, pickups, scoring, difficulty, and effect durations remain unchanged.

## Migration progress

- World-local pooled rendering: complete for obstacles, snow details, coins, shield pickups, speed boosts, and both ski tracks.
- Cabin availability and atomic request handling: complete.
- Timer render isolation: complete; distance remains a SharedValue and is published only when its displayed integer changes. Effect bars remain SharedValue-driven and publish pixel-quantized widths.
- Static TypeScript, ski-game ESLint, diff-integrity, and production Metro web export validation pass after this entry.
- Real-device 60 FPS and memory capture remains pending; the target is not claimed as measured until tested on target hardware.

## Important implementation notes

- Pool slot React elements remain memoized with stable callbacks and stable shared objects. Entity motion and timers do not enter React state, so they do not rerender the screen tree.
- Atlas animation stays at 12 FPS. Hidden coin, shield, and speed-boost slots now skip atlas crop calculations until visible.
- Viewport culling remains active in screen coordinates even though stored geometry is world-local.
- The cabin is no longer dependent on the one-shot debug-force flag or on an unusually late weighted RNG selection.

---

# Native render virtualization — 2026-07-30

## Files added or modified

No files or architectural layers were added.

| Area | Files modified |
|------|----------------|
| Documentation | `Readme.md` |
| Aggregated track rendering | `ui/SkiTrackRenderer.tsx` |
| Visibility-driven pooled rendering | `ui/ObstacleRenderer.tsx`, `ui/SnowSurfaceRenderer.tsx`, `ui/CoinRenderer.tsx`, `ui/ShieldPickupRenderer.tsx`, `ui/SpeedBoostRenderer.tsx`, `ui/CollisionBurstRenderer.tsx`, `ui/ShieldShatterRenderer.tsx` |
| Debug listener gating | `systems/CoinSystem.ts` |

## Architectural changes

- The public component/system hierarchy is unchanged. Pool-controller slots remain memoized children with stable callbacks and preallocated SharedValues.
- A pooled slot now owns only its small React visibility/source state. Its native visual child and Reanimated worklets mount only when that exact slot becomes visible and unmount when it leaves the render margin. The renderer parent and sibling slots do not rerender.
- Ski tracks now use one existing renderer with twelve aggregated `react-native-svg` paths. Both player/chaser rails are grouped into stable opacity bands and updated through string SharedValues only when the track point revision changes.
- Camera motion between track samples uses one parent transform relative to the last path anchor; it does not rebuild SVG path data every display frame.

## Gameplay systems implemented or preserved

- Obstacle, snow, coin, shield, speed-boost, particle, collision, collection, and despawn pools retain their original capacities and simulation behavior.
- Dual player/chaser ski rails, stroke width, segment overlap, rounded ends, and near-to-far fading are preserved. Twelve opacity bands replace per-segment native Views without changing gameplay.
- Cabin scheduling, retry persistence, authored formations, collision geometry, and bundled cabin asset remain unchanged.
- Collision and shield-shatter effects retain all pooled fragments. Only inactive/offscreen fragment views are absent from the native tree.

## Migration progress

- Ski-track native strokes: reduced from up to 188 permanently mounted animated Views to 12 aggregated SVG paths.
- Collision/shatter fragments: changed from 128 permanently mounted animated Views to active-visible-only visual children.
- Obstacles, snow details, coins, shields, and speed boosts: changed from capacity-sized permanent native visuals to active-visible-only visual children.
- Disabled coin lifecycle debugging no longer registers a production frame callback.
- TypeScript, ski-game ESLint, diff-integrity, and a fresh production Metro web export pass after this migration.

## Important implementation notes

- This approach targets UI-thread traversal, worklet count, image compositing, and memory directly. React memoization alone cannot remove the cost of hundreds of hidden native nodes.
- Visibility changes use an individual slot setter and happen only at activation/culling boundaries. Continuous gameplay motion remains on SharedValues and does not rerender the screen tree.
- The in-app browser controller was unavailable for an interactive local smoke test. Metro static rendering completed successfully, but native release/dev-client validation is still required.
- Do not measure this work in Expo development mode with profiling enabled. Record the final device result from a release or dev-client build with `PERFORMANCE_PROFILING: false`.

---

# Residual frame-spike smoothing — 2026-07-30

## Files added or modified

No files or architectural layers were added.

| Area | Files modified |
|------|----------------|
| Documentation/configuration | `README.md`, `utils/GameConfig.ts` |
| Spawn validation | `utils/spawn-validation.ts` |
| Track rendering | `ui/SkiTrackRenderer.tsx` |
| Preload mount scheduling | `ui/ObstacleRenderer.tsx`, `ui/SnowSurfaceRenderer.tsx` |
| Collision particles | `effects/CollisionBurst.ts`, `ui/CollisionBurstRenderer.tsx` |
| Shield-shatter particles | `effects/ShieldShatter.ts`, `ui/ShieldShatterRenderer.tsx` |

## Architectural changes

- Preserved the existing engine, system, renderer, and memoized pool-slot hierarchy. No provider, store, manager, system, or component layer was introduced.
- Obstacle and snow renderers now admit at most one newly visible native visual subtree per renderer per display frame. Unmounts remain immediate, and existing visible slots continue updating without a React render.
- The off-screen render margins act as a preload window, allowing multi-object formations to mount over successive frames before reaching the visible viewport.
- The normal maximum collision burst (12 fragments) and shield shatter (14 fragments) now stay warm as transparent native nodes. Higher pooled capacity remains visibility-virtualized.
- Ski-track camera/scroll motion remains display-frame driven through the parent transform, while expensive SVG path-string rebuild and transfer is capped at 20 Hz.

## Gameplay systems implemented or preserved

- Spawn order, obstacle/pickup positions, cabin scheduling, collision geometry, pool capacities, effect fragment counts, particle motion, and effect lifetimes are unchanged.
- Cabin visuals use the same preload budget as other obstacles and are logged as rendered only after their visual subtree has been admitted.
- Spawn-pattern occupancy retries now write into a module scratch footprint instead of allocating a retained object per retry. The public footprint API still returns an independent copy.
- Track sampling, dual rails, fade bands, collision behavior, scoring, difficulty, and timers are unchanged.

## Migration progress

- Sustained native-view reduction: complete.
- Residual boundary/event spike smoothing: complete for obstacle formations, snow details, normal collision bursts, shield shatters, track path refreshes, and spawn-pattern footprint retries.
- TypeScript, ski-game ESLint, diff-integrity, and a fresh production Metro web export pass after this entry.
- Final release-device frame pacing and memory capture remain pending.

## Important implementation notes

- `VISUAL_PRELOAD_MOUNTS_PER_RENDERER_FRAME` is intentionally `1`; with the existing render margins, even the largest four-obstacle authored pattern is preloaded before it enters the viewport at maximum configured scroll speed.
- `SKI_TRACK_PATH_SYNC_INTERVAL_MS` affects only immutable SVG path-data refresh. The entire trail still translates every display frame, so scrolling remains smooth between geometry refreshes.
- Warm particle slots remove React/native mounting from the common collision frame while retaining virtualization for overlapping effects beyond the authored per-event maximum.
- Timer values and continuous world motion remain outside React state and do not rerender the screen tree.
