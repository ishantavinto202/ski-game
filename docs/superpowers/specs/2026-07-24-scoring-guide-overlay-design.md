# Scoring Guide Overlay — Design Spec

**Date:** 2026-07-24  
**Status:** Approved for planning  
**Scope:** Presentation-only UI overlay documenting real Ski Game collectibles, boosters, and obstacles.

## Goal

Add a polished **SCORING GUIDE** overlay so players can understand:

- what each collectible does
- what each booster does
- every obstacle in the game
- score effects
- health/damage effects
- important gameplay effects

The guide must use **real game assets** already wired into the Ski Game. It must document **this game’s** mechanics (from config / score consequences), not a reference road-game theme.

## Access & State

### Entry points

Both overlays get the same compact **i** (info) button:

1. `PauseOverlay` — after Pause button opens pause UI
2. `GameOverOverlay`

Accessibility label: “Scoring Guide”. Generous touch target (~44×44).

### Flow

```
Pause / Game Over panel
  → tap i
  → ScoringGuideOverlay opens above that panel
  → tap X
  → guide closes; underlying overlay remains
```

### State ownership (Approach 1 — approved)

- Local React `useState` (`isScoringGuideOpen`) **inside** `PauseOverlay` and **inside** `GameOverOverlay`
- Each overlay mounts `ScoringGuideOverlay` when open
- Optional shared `ScoringGuideInfoButton` to avoid duplicating the **i** control chrome
- **No** engine / fixedUpdate / GameStateRef involvement
- Opening the guide must **not** call `requestResumeGame()` or restart helpers
- Pause path: `currentState` stays `'paused'`
- Game Over path: `currentState` stays `'game_over'`

## Architecture

### New files (under `src/components/ski-game/ui/`)

| File | Role |
|------|------|
| `ScoringGuideTypes.ts` | Item / section / prop types |
| `scoring-guide-data.ts` | Data-driven guide entries; reads config + consequences |
| `ScoringGuideRow.tsx` | Memoized reusable row |
| `ScoringGuideOverlay.tsx` | Scrim + panel + fixed header + ScrollView |
| `ScoringGuideInfoButton.tsx` | Shared **i** trigger (optional but preferred) |

### Exports

- Export through `ui/index.ts`
- Export through `ski-game/index.ts` if consistent with existing public exports

### Component tree

```
PauseOverlay / GameOverOverlay
  ├─ existing panel actions
  ├─ ScoringGuideInfoButton → setIsGuideOpen(true)
  └─ {isGuideOpen && (
       ScoringGuideOverlay onClose={() => setIsGuideOpen(false)}
         ├─ dark translucent scrim
         ├─ SafeArea-aware header (SCORING GUIDE + X)
         └─ ScrollView
              ├─ COLLECTIBLES & BOOSTERS → map → ScoringGuideRow
              └─ OBSTACLES → map → ScoringGuideRow
     )}
```

### Data-driven requirement

Do **not** hand-write nine separate JSX cards. Add future items by extending guide data arrays only.

```ts
type ScoringGuideItem = {
  id: string;
  category: 'collectible' | 'obstacle';
  title: string;
  description: string;
  asset: ImageSourcePropType;
  /** Atlas crop for sprite-sheet collectibles (coin / shield / speed boost). */
  assetFrame?: {
    x: number;
    y: number;
    w: number;
    h: number;
    atlasW: number;
    atlasH: number;
  };
  primaryEffect: string;
  secondaryEffect?: string;
  effectTone: 'positive' | 'negative' | 'neutral';
};
```

Arrays:

- `COLLECTIBLE_GUIDE_ITEMS` (3 entries)
- `OBSTACLE_GUIDE_ITEMS` (6 entries)

Effect display strings are built from authoritative sources at module load — **not** hardcoded magic numbers that can drift from gameplay.

## UI & Visual Design

### Overall

- Portrait mobile layout
- Dark translucent / navy panel over dimmed gameplay
- Slightly lighter item cards, rounded corners, subtle borders
- High-contrast white headings
- Icy / light-blue section accents
- Green for positive effects; red for damage / negative score; muted secondary description text
- Feel: polished winter ski arcade menu — **not** a road-game clone of the reference screenshot

### Header

- Large centered title: **SCORING GUIDE**
- Top-right **X** close control with generous touch target
- Respect `SafeAreaInsets`

### Scrolling

- Fixed header (preferred)
- `ScrollView` for body content (9+ items)
- Bottom padding for home indicator / safe area
- Content must not sit under the iPhone home indicator

### Row layout

```
┌─────────────────────────────────────┐
│ [64–76px preview]  Title     effect │
│                    description      │
└─────────────────────────────────────┘
```

- Asset left, info center, effect right-aligned
- Enough horizontal room for long names (`Wooden Fence`, `Large Boulder`, `Speed Boost`)

### Asset preview box

- Fixed ~64–76 px square
- `resizeMode="contain"`
- Obstacles may use existing PNG metadata for presentation-only centering (cabin / tree / fence / rocks)
- Guide sizing must **not** change `OBSTACLE_ASSET_SCALE` or gameplay footprints
- No placeholder rectangles; no emojis as asset replacements
- Heart glyph allowed only as compact effect text (e.g. `♥ -1`), not as a substitute for obstacle art

## Guide Content (exact mechanics)

### Section 1 — Collectibles & Boosters

| Id | Title | Description | Asset | Effects | Source |
|----|-------|-------------|-------|---------|--------|
| `coin` | Coin | Collect for score | Coin atlas frame `1` | `+20` / `SCORE` (green) | `COIN_COLLECT_SCORE` in `score-consequences.ts` |
| `shield` | Shield | Protects you from a hit | Shield atlas frame `1` | `BLOCKS 1 HIT` + `4 SEC` | `ShieldSystem` + `SHIELD_DURATION_MS`; consumed on obstacle hit or expiry; while active, HealthSystem skips score + health damage |
| `speed_boost` | Speed Boost | Temporary downhill speed boost | Speed-boost atlas frame `1` | `1.75× SPEED` + `4 SEC` | `SPEED_BOOST_MULTIPLIER`, `SPEED_BOOST_DURATION_MS` — no direct score award |

Duration labels must be derived from config (e.g. `SHIELD_DURATION_MS / 1000` → `4 SEC`), not literals that can drift.

### Section 2 — Obstacles

All six gameplay variants. Tree’s three visual PNGs are **one** guide entry (representative Tree 1 asset).

| Id | Title | Description | Asset | Consequence | Source |
|----|-------|-------------|-------|-------------|--------|
| `small_rock` | Small Rock | Small snow-covered hazard | `smallRockAsset` | `-15` score; no hearts | `OBSTACLE_CONSEQUENCES.small_rock` |
| `large_boulder` | Large Boulder | Large mountain obstacle | `largeBoulderAsset` | `-30` + `♥ -1` | `OBSTACLE_CONSEQUENCES.large_boulder` |
| `tree` | Tree | Avoid the alpine trees | Tree visual 1 | `-25` + `♥ -1` | `OBSTACLE_CONSEQUENCES.tree` |
| `tree_stump` | Tree Stump | Low snow-covered obstacle | `treeStumpAsset` | `-20` score; no hearts | `OBSTACLE_CONSEQUENCES.tree_stump` |
| `cabin` | Cabin | Large mountain obstacle | `cabinAsset` | `-50` + `♥ -2` | `OBSTACLE_CONSEQUENCES.cabin` |
| `wooden_fence` | Wooden Fence | Blocks part of your route | `woodenFenceAsset` | `-35` + `♥ -1` | `OBSTACLE_CONSEQUENCES.wooden_fence` |

**Obstacle score penalties:** Yes — per-variant `scoreDelta` values above. Do not invent values; do not assume all obstacles are ♥−1 only.

**Total entries:** 9 (3 collectibles/boosters + 6 obstacles).

## Asset Reuse

- Reuse existing requires / exports from `obstacle-assets.ts` for obstacles
- Reuse existing coin / shield / speed-boost atlas textures already used by renderers
- Do **not** duplicate PNG files
- Do **not** change gameplay asset anchoring to fix guide previews

## Explicit Non-Goals / Do Not Change

Do not modify behavior of:

- GameLoop, GameEngine simulation
- WorldSystem, MovementSystem, PlayerFeelSystem
- CollisionSystem, HealthSystem behavior
- DifficultySystem, SpawnManager, SpawnPatterns
- ObstacleSystem, CoinSystem, ShieldSystem behavior, SpeedBoostSystem behavior
- Object pooling, obstacle dimensions, `OBSTACLE_ASSET_SCALE`, collision hitboxes, score mechanics

This phase **reads** configuration and **presents** it.

README updates follow the project rule: update `Readme.md` after changes are pushed (not required as part of the design commit).

## Verification

After implementation:

1. `npx tsc --noEmit`
2. `npx expo lint`
3. Manual: Pause → **i** → scroll all 9 rows → **X** → still paused; Resume still works
4. Manual: Game Over → **i** → **X** → still game over; Play Again / Quit unchanged

### Implementation report checklist

1. Files created/changed
2. Where the Scoring Guide can be opened
3. Exact Coin score value + source
4. Exact Shield behavior shown + source
5. Exact Speed Boost duration/multiplier + config sources
6. Exact collision consequence for each of the six obstacles
7. Whether any obstacle has a score penalty (yes — document values)
8. Confirmation all 9 entries use real existing game assets
9. Confirmation gameplay systems/mechanics were not changed
10. Confirmation overlay is scrollable and safe-area aware

## Decisions Log

| Decision | Choice |
|----------|--------|
| Visual companion | Declined |
| State ownership | Local boolean inside Pause + Game Over overlays |
| Access control | Shared **i** button on both Pause and Game Over |
| Architecture approach | Embedded per-overlay + shared guide components/data |
| Tree visuals | One representative tree asset (Tree 1) |
| Collectible previews | First numbered atlas frame (`1`) cropped from existing sheets |
