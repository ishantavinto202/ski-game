# Phase 3 — Gameplay Systems Optimization

**Date:** 2026-07-28  
**Scope:** Fixed-update / simulation CPU only (no renderer or UI changes).

---

## 1. Summary

### ChaserAvoidance (highest impact)
- Added conservative **vertical relevance prefilter** before envelope / lookahead math so far-above and already-passed obstacles skip the heavy path.
- Max lookahead bound: `CHASER_AVOID_LOOKAHEAD + viewportWidth * LOOKAHEAD_PER_LATERAL` — never skips a true approach-window hit.
- Cached config constants (`CHASER_W/H`, min avoid sizes, lookahead coeffs).
- Inlined screen-Y conversion in envelope resolve (no helper call).
- Applied the same Y cull to clearance measurement, secondary threat scan, safe-follow, and primary selection.

### SnowSurfaceSystem
- Overlap tests check **ΔY first** and early-out before ΔX — fewer arithmetic ops on non-overlapping pairs (identical AABB result).

### Spawn validation / pickups
- Module **scratch footprints** for hot obstacle / pickup / pending overlap tests (no per-obstacle object alloc in loops).
- `findClearPickupSpawn` writes one reusable candidate footprint instead of allocating per probe.
- Shield nudge / block helpers use scratches + expanded inset write (no `expandFootprintInsets` alloc).
- `calculatePatternFootprint` merges into scratches then returns one copy (public API safe).
- Vertical band reject before writing obstacle footprints in `isActiveObstacleAreaOccupied`.

### Spawn population
- Reuses a module `spawnLayoutScratch` instead of allocating a layout object every pattern attempt.

### CollisionSystem
- **Conservative gameplay-AABB reject** before physical hitbox resolve — if unpadded gameplay rects cannot overlap, skip `getObstacleCollisionScreenRect` (physical hitbox ⊆ gameplay). Results unchanged.

### Fixed-update hygiene
- No new `map`/`filter`/`reduce`/spreads in gameplay loops.
- Scratch reuse reduces GC pressure during spawn validation spikes.

---

## 2. Files Modified

| File | Change |
|------|--------|
| `entities/ChaserAvoidance.ts` | Y prefilters, cached constants, padding-aware lookahead |
| `systems/SnowSurfaceSystem.ts` | Y-first overlap |
| `systems/CollisionSystem.ts` | Gameplay AABB early reject |
| `utils/spawn-validation.ts` | Scratch footprints, cheaper pickup probes |
| `utils/spawn-population.ts` | Layout scratch reuse |

**Untouched:** Renderers, UI, HUD, Reanimated, assets, difficulty formulas, spawn weights/patterns content.

---

## 3. Performance Impact (estimated)

| Metric | Expected effect |
|--------|-----------------|
| Fixed-update CPU (chaser) | **Meaningful** — fewer full envelope scans under dense obstacle pools |
| Spawn validation spikes | **Lower GC + less work** per probe / pattern retry |
| Snow overlap cost | **Moderate** reduction on non-overlapping pairs |
| Collision | **Small–moderate** — skip layout resolve for off-screen / distant obstacles |
| Frame-time consistency | Better under mid/late-game density |
| Expected FPS | Helps hold **60 FPS** when sim was the spike source (pairs with Phase 2 render wins) |

---

## 4. Risks / Manual Test Checklist

- [ ] Chaser steers around rocks/trees/cabins the same way (no new clipping through obstacles)
- [ ] Chaser hysteresis / side preference still feels the same when two obstacles stack
- [ ] Pause / resume does not leave chaser stuck in avoid state incorrectly
- [ ] Snow details still avoid obstacle footprints (placement + runtime cull)
- [ ] Coins / shields / speed boosts still find clear lanes (no overlapping pickups)
- [ ] Obstacle hit detection identical (same damage / shield break timing)
- [ ] Pattern density and difficulty ramp feel unchanged over a long run

---

## 5. Preservation Confirmation

| Requirement | Status |
|-------------|--------|
| Gameplay preserved | **Yes** — early exits are conservative (true-negative only) |
| Difficulty preserved | **Yes** — no ramp / weight / interval changes |
| Spawn behavior preserved | **Yes** — same search order, caps, and acceptance rules |
| Chaser behavior preserved | **Yes** — same approach window / selection logic; skipped cases cannot affect decisions |
| Collision preserved | **Yes** — reject only when gameplay AABBs cannot overlap |
| Visuals preserved | **Yes** — no render changes |
| APIs preserved | **Yes** — public function signatures unchanged |
| Architecture preserved | **Yes** — same systems / pooling / engine refs |

---

## Validation

- `npx tsc --noEmit` — passed after Phase 3 changes.
