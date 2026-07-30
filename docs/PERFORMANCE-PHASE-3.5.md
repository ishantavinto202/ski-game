# Phase 3.5 — Runtime Profiling & Bottleneck Identification

**Status:** Instrumentation shipped. Numeric report sections stay empty until a device capture is dumped.

This phase does **not** optimize. It measures where frame time goes so Phase 4 can target evidence only.

---

## How to enable

1. In `src/components/ski-game/utils/GameConfig.ts` set:

```ts
PERFORMANCE_PROFILING: true,
```

2. Run a **dev** build (`npx expo start`). The overlay mounts only when `__DEV__ && PERFORMANCE_PROFILING`.

3. Play ~60 seconds of active gameplay (include a short pause to verify pause metrics).

4. Tap **Dump** on the PERF overlay — the full markdown report prints to the Metro / Xcode console.

5. Copy that console output into `docs/PERFORMANCE-RUNTIME-REPORT.md` (replace the placeholder below), or save it beside this file.

6. When investigation is done, set `PERFORMANCE_PROFILING: false` (near-zero overhead; overlay unmounts).

---

## What is instrumented

| Area | Mechanism |
|------|-----------|
| Frame timing | rAF delta ring buffer (avg / worst / best / 1% low / FPS) |
| Fixed systems | Per-`system.id` `performance.now()` around `fixedUpdate` |
| GameLoop / GameEngine | Outer bucket timings |
| Render sync | Playing `onPlayingFrame` listener wall time |
| onFrame | Always + playing listener counts + callbacks/frame |
| SharedValue | `writeSharedNumber` write vs unchanged skip |
| Collision / chaser / snow / spawn | Hot-path counters (no-op when flag off) |
| Overlay pools | Active obstacles, snow, coins, shields, boosts, particles, ski segments |

---

## Removability

All hooks early-return when `PERFORMANCE_PROFILING` is false. After Phase 4, delete:

- `src/components/ski-game/profiling/`
- Flag + call sites (grep `profile` / `PERFORMANCE_PROFILING`)

---

# Placeholder report (replace after Dump)

Paste the console Dump markdown here. Until then, **do not invent rankings**.

## Executive Summary

_Pending device capture._

## Frame Timing

_Pending device capture._

## System Timing

_Pending device capture._

## Renderer Timing

_Pending device capture._

## Active View Counts

_Pending device capture._

## SharedValue Statistics

_Pending device capture._

## Memory Statistics

_Pending device capture._

## Spawn Statistics

_Pending device capture._

## Collision Statistics

_Pending device capture._

## Chaser Statistics

_Pending device capture._

## Snow Statistics

_Pending device capture._

## Top 10 Runtime Bottlenecks

_Pending device capture — rank by measured execution time only._

## Recommendations

_Pending device capture — Phase 4 scope must follow measured Top 10 only._
