# Phase 2 — Render Pipeline Optimization

**Date:** 2026-07-28  
**Scope:** Render synchronization only (no gameplay system changes).

---

## 1. Summary

### Frame listener consolidation
- Slot-based renderers (obstacles, snow, coins, pickups, ski tracks, particles, feedback, edge trees) now register **one** `onPlayingFrame` listener per renderer instead of one per slot.
- SharedValues for slots are created once via Reanimated `makeMutable` and updated in a single parent loop.

### Dual frame channels (`GameEngine` / `GameLoop`)
- `onFrame` — always runs (pause / game-over UI overlays).
- `onPlayingFrame` — world / entity sync; **skipped while paused or game over** so SharedValues freeze without JS fan-out.
- `notifyFrame(syncPlayingWorld)` re-reads gameplay state after transitions so pause overlays still update.

### Obstacle renderer
- Replaced **8 stacked `AnimatedImage` layers per slot** with **one image** whose `source` updates only when the asset index changes.
- Placeholder + optional debug hitbox retained.
- Identical artwork; pooling preserved.

### Snow surface renderer
- Replaced **5 stacked images per slot** with **one image** + type-index source swap.
- Appearance (opacity, sizing, placement) unchanged.

### Ski track renderer
- Removed allocating `readSkiTrackSegmentLayout()` object returns.
- One listener rebuilds layouts then writes Float64Array fields directly into SharedValues.
- Segment stroke views unchanged.

### SharedValue write gating
- Added `writeSharedNumber` to skip redundant SharedValue assignments when values are unchanged.

### Pause optimization
- World render sync does not run while not playing; UI overlays keep listening on `onFrame`.

---

## 2. Files Modified

| File | Change |
|------|--------|
| `engine/GameEngine.ts` | `onPlayingFrame` + `notifyFrame(boolean)` |
| `engine/GameLoop.ts` | Pause-aware world sync |
| `utils/shared-value-write.ts` | **New** — gated SharedValue writes |
| `effects/SkiTrack.ts` | Removed allocating layout reader |
| `ui/ObstacleRenderer.tsx` | 1 listener, 1 image/slot |
| `ui/SnowSurfaceRenderer.tsx` | 1 listener, 1 image/slot |
| `ui/SkiTrackRenderer.tsx` | 1 listener, no layout allocs |
| `ui/CoinRenderer.tsx` | Consolidated listener |
| `ui/ShieldPickupRenderer.tsx` | Consolidated listener |
| `ui/SpeedBoostRenderer.tsx` | Consolidated listener |
| `ui/CollisionBurstRenderer.tsx` | Consolidated listener + tick |
| `ui/ShieldShatterRenderer.tsx` | Consolidated listener + tick |
| `ui/GameplayFeedbackRenderer.tsx` | Consolidated listener + tick |
| `ui/EdgeTreeRenderer.tsx` | Consolidated listener (still gated by config) |
| `ui/WorldRenderer.tsx` | `onPlayingFrame` |
| `ui/PlayerRenderer.tsx` | `onPlayingFrame` |
| `ui/ChaserRenderer.tsx` | `onPlayingFrame` |
| `ui/ShieldBubbleRenderer.tsx` | `onPlayingFrame` |
| `ui/Hud.tsx` | `onPlayingFrame` |
| `ui/ActiveEffectDurationHud.tsx` | `onPlayingFrame` |
| `utils/shield-rock-overlap-debug.tsx` | `onPlayingFrame` |

**Untouched (by design):** SpawnManager, CollisionSystem, ChaserAvoidance, SnowSurfaceSystem logic, DifficultySystem, gameplay rules.

---

## 3. Performance Impact (estimated)

| Metric | Before (Phase 1) | After (Phase 2) |
|--------|------------------|-----------------|
| Frame listeners (playing) | ~350–400 | **~15–20** |
| Obstacle mounted images | ~512 (64×8) | **≤64** (1/slot) |
| Snow mounted images | ~120 (24×5) | **24** |
| Ski track listeners | 95 (1 + 94) | **1** |
| Particle / feedback listeners | 65+65+7 | **1 each** |
| JS thread (render sync) | High fan-out | **Large reduction** (~10–20× fewer callbacks) |
| UI thread (worklets) | Hundreds of opacity/style worklets on layered images | **Far fewer** (obstacles ~8×, snow ~5×) |
| GC from ski layout objects | Per segment / frame | **Eliminated** |
| Expected FPS | Unstable under density | **More stable 60 FPS**, lower frame-time variance |

---

## 4. Risks / Manual Test Checklist

- [ ] Obstacles: all variants (trees 0–2, cabin, rocks, stump, fence) render correctly when spawning
- [ ] Obstacle source swaps when a pooled slot is reused for a different variant
- [ ] Snow details: all 5 types appear with correct opacity (~0.72)
- [ ] Ski tracks (player + chaser) look continuous; no flicker on pause/resume
- [ ] Coins / shield / speed-boost atlas animations still loop at ~12 FPS
- [ ] Collision burst + shield shatter particles still play on hit / shield break
- [ ] Pause: world freezes; pause overlay appears; resume continues cleanly
- [ ] Game over overlay still shows final score / distance
- [ ] HUD hearts / score / distance and effect duration bars update during play
- [ ] No visual regression vs pre-Phase-2 build on a mid-tier device

---

## 5. Preservation Confirmation

| Requirement | Status |
|-------------|--------|
| Gameplay preserved | **Yes** — no spawn / collision / difficulty / chaser logic changes |
| Visuals preserved | **Yes** — same assets, layouts, opacities; layered images → single image with same source |
| Public APIs preserved | **Yes** — renderers keep same props; `onFrame` still exists; `onPlayingFrame` is additive |
| Architecture preserved | **Yes** — engine refs, pooling, Reanimated SharedValues, system registration unchanged |
| Object pooling preserved | **Yes** |
| No memory leaks intended | Listeners unregister in `useEffect` cleanups; setters cleared on unmount |

---

## Validation

- `npx tsc --noEmit` — passed after Phase 2 changes.
