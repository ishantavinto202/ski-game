# Phase 1 — Performance Audit (ASK MODE)

**Date:** 2026-07-28  
**Scope:** Static/code analysis only — no runtime profiling on device.

---

## 1. Executive Summary

This ski game uses a **hybrid architecture that is strong on simulation and weak on presentation scale**: gameplay state lives in `GameEngine` refs, systems run on a **fixed timestep** via `requestAnimationFrame`, and the React tree **does not re-render every frame** during play. Visuals are driven by **Reanimated `SharedValue`s** updated from `engine.onFrame()` listeners.

The main risk to stable **60 FPS** is not the game loop design itself—it is **render-side fan-out**: hundreds of per-slot `onFrame` callbacks per display frame, **~1,000+ permanently mounted native views** (especially obstacle/snow multi-image slots), and **per-frame JS work** on ski tracks and particle effect ticks. Simulation cost spikes come from **Chaser avoidance** (full obstacle scans with heavy logic), **snow-surface vs obstacle overlap**, and **spawn validation** (bounded but large probe counts).

There is **no `runOnJS`** usage; the JS thread owns both simulation stepping and pushing shared values to the UI thread. **Zustand is effectively inert** during gameplay (`skiGameStore` only exposes a no-op `reset`).

---

## 2. Performance Score: **68 / 100**

| Area | Assessment |
|------|------------|
| Game loop / timestep | Strong |
| Simulation pooling & hot-path alloc discipline | Strong |
| React re-render isolation | Strong |
| Render mount count & layer multiplication | Weak |
| JS `onFrame` listener count | Weak |
| Fixed-step CPU under load (chaser, snow, spawn) | Medium |

---

## 3. Estimated Bottlenecks

### Critical

1. **~350–400 `engine.onFrame` listeners per session** — each rAF invokes a linear fan-out in `GameEngine.notifyFrame()` before Reanimated applies updates.
2. **Obstacle rendering: 64 slots × 8 `AnimatedImage` layers each** (~512 images) plus placeholders — opacity culling hides visuals but nodes and worklets remain.
3. **Snow surface: 24 slots × 5 asset layers** (~120 images) with the same pattern.

### High

4. **`rebuildSkiTrackSegmentLayouts` twice per display frame** (player + chaser) in `syncSkiTrackRendererFrame`, plus **94 segment slots** each with its own `onFrame` callback.
5. **`readSkiTrackSegmentLayout` returns a new object literal every call** inside segment `onFrame` handlers — GC pressure during motion.
6. **`ChaserAvoidance.resolveChaserHorizontalTargetX`** — O(`MAX_OBSTACLES`) scan with multiple envelope/threat computations per active obstacle **every fixed step**.
7. **Native view / compositor load** from slot-based rendering (coins, pickups, particles, tracks, obstacles combined).

### Medium

8. **`SnowSurfaceSystem.fixedUpdate`** — `deactivateSnowDetailsOverlappingObstacles` is O(details × obstacles); `maintainSnowSurfaceAhead` up to 24 iterations × placement retries × obstacle scans.
9. **`findClearPickupSpawn`** — up to **288 probes** × validation against obstacles/pending requests (on spawn timer, not every frame, but can hitch).
10. **`maintainSpawnPopulationAhead`** — up to **3 patterns per fixed step** with multi-attempt pattern validation.
11. **Particle systems tick on rAF** with variable `performance.now()` delta (`tickCollisionBurst`, `tickShieldShatter`, `tickGameplayFeedback`) — extra JS per frame, decoupled from fixed step.
12. **HUD `AnimatedTextInput` + `useAnimatedProps`** — score/distance/health text updates every frame when values change.

### Low

13. **`MAX_FIXED_STEPS = 8` accumulator clamp** — under severe lag, simulation time is discarded (hitches + possible feel inconsistency), not sustained overload.
14. **Debug hooks** (`coin-scheduling-debug`, `coin-active-lifecycle-debug`, cabin logs) — gated off (`*_ENABLED = false`); remaining calls are mostly no-ops.
15. **`setViewport` allocates `{ width, height }`** only on layout changes — negligible.
16. **Decorative trees disabled** (`DECORATIVE_TREES_ENABLED: false`) — avoids 128 slots × listeners (would be critical if re-enabled).

---

## 4. File-by-File Findings

### Engine & loop

| File | Function / component | Root cause | Impact | Confidence |
|------|----------------------|------------|--------|------------|
| `engine/GameLoop.ts` | `onFrame` | Fixed step ~16.67 ms, max 8 steps; excess accumulator zeroed | Lag spikes → stutter / lost sim time | High |
| `engine/GameLoop.ts` | `onFrame` | Always calls `notifyFrame()` even when paused (`playing` false) | Pause still runs full render sync JS | High |
| `engine/GameEngine.ts` | `notifyFrame` | Synchronous iteration over all `frameListeners` | JS thread scales with listener count | High |
| `engine/GameEngine.ts` | `runFixedUpdate` | ~20 systems × up to 8 steps per rAF on catch-up | JS overload on frame drops | Medium |
| `hooks/useGameLoop.ts` | `useGameLoop` | rAF tied to `isSimulationReady` only, not pause | Loop runs during pause/menu-in-game | Medium |

### Systems (gameplay)

| File | Function | Root cause | Impact | Confidence |
|------|----------|------------|--------|------------|
| `systems/TimeSystem.ts` | `fixedUpdate` | `totalDistance` uses `BASE_SCROLL_SPEED` only (not difficulty/boost scroll) | HUD accuracy only; minor wasted clarity | Low |
| `systems/WorldSystem.ts` | `fixedUpdate` | Actual scroll uses difficulty × speed boost | Correct motion; cheap | Low |
| `systems/CollisionSystem.ts` | `fixedUpdate` | Linear scan up to 64 obstacles; early exit on hit | ~64 AABB tests/step — cheap | Low |
| `systems/ChaserSystem.ts` | `fixedUpdate` | Calls `resolveChaserHorizontalTargetX` every step | High CPU when many obstacles in lookahead | High |
| `entities/ChaserAvoidance.ts` | `resolveChaserHorizontalTargetX` | Full obstacle array loop + envelope math | Worst-case ~64 × heavy logic per step | High |
| `systems/SnowSurfaceSystem.ts` | `fixedUpdate` | Overlap cull + fill loop (guard 24) × obstacle scans | Periodic fixed-step spikes | High |
| `managers/SpawnManager.ts` | `fixedUpdate` | Population + rotating pickup + debug tick | Spikes when patterns/validation run | Medium |
| `utils/spawn-validation.ts` | `findClearPickupSpawn` | Up to 288 placement probes | Hitches on pickup enqueue failure paths | Medium |
| `utils/spawn-population.ts` | `maintainSpawnPopulationAhead` | Up to 3 patterns/step with validation retries | Mid-game spawn pressure | Medium |
| `systems/CoinSystem.ts` | `mount` | Registers `onFrame` for lifecycle debug (disabled) | One extra listener; debug path inert | Low |
| `effects/SkiTrack.ts` | `syncSkiTrackRendererFrame` | Full segment rebuild ×2 per **display** frame | JS + trig (`sqrt`, `atan2`) every rAF | High |
| `effects/SkiTrack.ts` | `readSkiTrackSegmentLayout` | Returns new object each call | GC per visible segment per frame | High |

### Rendering

| File | Component | Root cause | Impact | Confidence |
|------|-----------|------------|--------|------------|
| `ui/ObstacleRenderer.tsx` | `ObstacleRenderSlot` | 64 slots; each mounts 8 `ObstacleAssetImageLayer` images | ~576 animated images; 64 `onFrame` handlers | Critical |
| `ui/SnowSurfaceRenderer.tsx` | `SnowSurfaceRenderSlot` | 24 × 5 asset layers | ~120 images; 24 handlers | Critical |
| `ui/SkiTrackRenderer.tsx` | `SkiTrackSegmentSlot` | 47 segments × 2 tracks × 2 strokes | 94 handlers + layout rebuild | High |
| `ui/CollisionBurstRenderer.tsx` | slots + tick | 64 slots + `tickCollisionBurst` on rAF | JS + views; active only during bursts | Medium |
| `ui/ShieldShatterRenderer.tsx` | same pattern | 64 particle slots | Same as burst | Medium |
| `ui/CoinRenderer.tsx` | slots + atlas | 24 slots; atlas crop in `useAnimatedStyle` | Moderate UI thread work | Medium |
| `ui/PlayerRenderer.tsx` | `PlayerRenderer` | Single slot; atlas animation | Well bounded | Low |
| `ui/WorldRenderer.tsx` | scroll strip | 2 tiles; 1 `onFrame` | Efficient background | Low |
| `ui/Hud.tsx` | `HudNumberField` | `useAnimatedProps` text every frame | Native text layout churn | Medium |
| `components/SkiGameViewport.tsx` | tree | Many simultaneous render layers | Deep compositing stack | Medium |

### React / state

| File | Root cause | Impact | Confidence |
|------|------------|--------|------------|
| `hooks/useGameViewport.ts` | `useState` for viewport/player snapshot | Re-render only on layout — correct | High (positive) |
| `stores/skiGameStore.ts` | Empty store | No gameplay subscription rerenders | High (positive) |
| `components/SkiGameRoot.tsx` | Phase menu/game | Gameplay subtree unmounts on menu | Low |

### Assets

| File | Root cause | Impact | Confidence |
|------|------------|--------|------------|
| `utils/obstacle-assets.ts` | Static `require()` per variant | Decode at first use; 8 sources reused via layering | Medium (memory) |
| `ui/CoinRenderer.tsx` | Single atlas PNG + JSON frames | Good reuse pattern | Low (positive) |
| `utils/player-sprite.ts` (via PlayerRenderer) | Atlas-based player | Good pattern | Low (positive) |
| `utils/snow-surface-assets.ts` | 5 PNGs × 24 slots via layering | Texture reuse OK; view count high | Medium |

### Object pooling (verified)

| Pool | Max size | Create/destroy in play |
|------|----------|-------------------------|
| Obstacles | 64 | Activate/deactivate only |
| Coins | 24 | Activate/deactivate |
| Shields / speed boosts | 12 each | Activate/deactivate |
| Snow details | 24 | Activate/deactivate |
| Decorative trees | 128 | Disabled |
| Collision / shatter particles | 64 each | Pool slots |
| Gameplay feedback | 6 | Pool entries |
| Spawn requests | 72 preallocated | In-place queue compaction |

No evidence of unbounded `new` arrays in fixed-update systems (systems grep shows no `.map`/`.filter` in `systems/*.ts`).

---

## 5. Estimated Sources of Symptoms

| Symptom | Likely sources (evidence-based) |
|---------|----------------------------------|
| **FPS drops** | Obstacle/snow mount multiplication; ski track rebuild + 94 segment syncs; chaser avoidance under obstacle density; compositor load |
| **Stuttering** | Fixed-step catch-up (8 steps); spawn/snow validation spikes; GC from `readSkiTrackSegmentLayout` objects; pickup probe bursts |
| **GC pauses** | Ski track layout object returns; spawn footprint objects during validation (spawn-time); occasional debug paths if enabled |
| **JS thread overload** | ~381 `onFrame` callbacks/frame; 2× ski track rebuild; particle ticks; multiplied fixed steps on lag |
| **UI thread overload** | Hundreds of `useAnimatedStyle` worklets updating transforms/opacity; atlas crop math on coins/player; rotated ski segments |
| **Excessive React renders** | **Not observed in gameplay** — only layout/overlay UI state; gameplay uses refs + SharedValues |

---

## 6. Prioritized Optimization Plan (by expected FPS gain)

Order assumes **preserving architecture** (pooled slots, same systems, same feel)—incremental changes only.

1. **Single `onFrame` per renderer layer** (or per engine) that updates all slots in one callback — cuts ~350 invocations to ~15. **Highest JS win.**
2. **Obstacle slot: one `AnimatedImage` per slot** (switch source/index) instead of 8 stacked images — large view-count and worklet reduction.
3. **Snow slot: one image per slot** (same pattern) — proportional to (5×) view reduction.
4. **Ski track: inline layout reads** (no object return); optionally move `rebuildSkiTrackSegmentLayouts` to fixed step or sync once per layer — reduces rAF JS + GC.
5. **Early-out in segment `onFrame`** when `activeSegmentCount` unchanged and scroll delta below epsilon — skip redundant shared writes.
6. **Chaser avoidance: reduce scans** (e.g. skip obstacles below pass margin before envelope math) — fixed-step CPU under density.
7. **Snow overlap cull: spatial narrow** (only obstacles near detail Y) or run every N steps — fixed-step spikes.
8. **HUD: update score/distance text at 10–15 Hz** or only on integer change — less native text work.
9. **Particle tick: tie to fixed step** or single pooled tick callback — cleaner CPU profile; minor unless bursts active.
10. **Pause: skip `notifyFrame` or register listeners only while `playing`** — saves idle/pause CPU.
11. **Keep decorative trees off** until slot/listener consolidation exists — re-enable would replicate obstacle-scale cost.
12. **Profile-guided spawn validation** — only if hitches correlate with pickup timer (288-probe path).

---

## Audit Checklist Summary

| Topic | Finding |
|-------|---------|
| **Fixed timestep** | Correct accumulator; 60 Hz step; 8-step cap with discard |
| **Duplicate updates** | GameState not double-run; render sync once per rAF |
| **Bridge / runOnJS** | None; JS pushes SharedValues |
| **Re-render frequency** | Low (layout/overlays only) |
| **Per-frame React** | None in game loop |
| **Pooling** | Consistent for entities/effects |
| **Assets** | Atlases for player/coins; obstacles/snow use multi-require layering |

---

## Validation note

This audit is static/code-based. Confirm with React Native Performance Monitor, Flipper, or device profiling on target hardware (especially mid-tier Android) to validate JS vs UI thread attribution and quantify gains after changes.
