# Coin Problems — Investigation Archive

This document records the **observed coin behaviour**, **user prompts**, **assistant findings**, and **code changes** from the July 2026 spawn/coin debugging arc. It is a narrative archive, not a design spec.

**Primary symptom (reported repeatedly):** The first coin appears and animates correctly; during long runs (3+ minutes), **almost no additional coins are visible**, while obstacles and cabins spawn normally.

**Related sessions:** [Coin lifecycle & pipeline](fbf8843c-7d48-4dd5-b63e-c6e30ac78877), [Scheduling instrumentation & activation](fc8d4929-489e-48b4-9f9e-7ac70602a9cd), [Shield overlap pivot](f61686cf-130c-408f-9c2d-22700fa7ea52).

---

## 1. Executive summary

| Stage | Conclusion |
|--------|------------|
| **Animation / renderer** | Ruled out — first coin animates; pipeline can render coins. |
| **Shared spawn pipeline** | Partially fixed — pickup-before-population, activation retry, queue compaction helped **cabins/obstacles**, not coin visibility alone. |
| **Pickup placement search** | Expanded (multi-lane, multi Y-band probes) — **did not** restore visible coin cadence by itself. |
| **SpawnManager scheduling** | **Two real bugs fixed:** (1) `kindCursor` stalling/skipping coin turns on failed placement; (2) pickup base Y using `SPAWN_LOOKAHEAD_DISTANCE` (600) instead of aligning with **`POPULATION_LOOKAHEAD` (900)** / pattern cursor. |
| **Runtime logs (post-instrumentation)** | Timer, rotation, and **enqueue succeed often** (e.g. 11 enqueues, 1 activation) → bottleneck moved **after enqueue**. |
| **Activation / visibility** | **Confirmed:** coins activated with **stale enqueue `worldY`** can spawn with `screenY` already at/ past despawn line → **instant despawn or never visible**. **`resolveCoinActivationWorldY`** added at **CoinSystem** activation (not SpawnManager). |
| **User-reported status (late session)** | Still “only one coin at start” after several fixes → investigation **paused** to address **shield overlapping grey rock** instead. **Coin issue may remain open** on device; use debug summaries below to verify. |

---

## 2. Coin pipeline (reference)

```
GameLoop (fixedUpdate, state === playing)
  → SpawnManager.tickRotatingPickupSpawn
      → tryEnqueuePickupSpawn('coin' | 'shield')
      → findClearPickupSpawn (coin: active obstacles only)
  → SpawnManager.maintainSpawnPopulationAhead (obstacle patterns)
  → CoinSystem.consumeCoinSpawnRequests
      → isSpawnRequestPastDespawn? → stale drop
      → spawnCoinFromRequest
          → resolveCoinActivationWorldY(request.worldY)
          → activateCoinFromSpawn
  → CoinRenderer (onFrame, screen rect from scroll + camera)
  → collect / despawnBelowViewport → deactivateCoin → pool reuse
```

**Pickup validation asymmetry (still true for coins):**

- **Coin** enqueue: `findClearPickupSpawn` → `isActiveObstacleAreaOccupied` only (**no** pending obstacle rows).
- **Shield** enqueue: stricter (`isSpawnAreaOccupied` + clearance).
- **Obstacle patterns** (after fix): also check **`isPickupAreaOccupied`** so rocks do not stack on pickups.

---

## 3. Chronology — prompts and answers

### Phase A — Lifecycle investigation (no code changes)

#### Your prompt

> The Coin animation works correctly. This is NOT an animation issue.  
> Observed: first Coin appears normally; after it disappears, no additional Coins ever appear.  
> Do NOT fix anything yet. Investigate the Coin lifecycle from spawn to despawn.  
> Trace: SpawnManager → CoinSystem → pool → activation → renderer → collection/despawn → pool → next spawn.

#### Answer (summary)

Static trace showed the **architecture supports repeated spawns** (pool, timer rotation, CoinSystem intake). Hypotheses included: spawn timer/`kindCursor`, placement validation, queue consumption, pool exhaustion, or despawn without reuse. **No single root cause** until runtime data existed.

---

### Phase B — Systemic spawn pipeline (upstream)

#### Your prompt

> Coins and cabins are extremely rare. This is NOT a Coin-only bug. Trace the **entire** spawning pipeline for obstacles, cabins, coins, shield, speed boost. Find the **first** place frequency collapses.

#### Answer (summary)

Multiple entity types shared **SpawnManager**, **pending queue**, and **validation order**. Issues found included:

- Pickup validation seeing **same-frame obstacle queue** as occupied.
- **Failed activations** dropping requests instead of retrying.
- **Pickup rotation** relative to **population** ordering.

#### Your prompt (fix request)

> Run pickup spawning before obstacle population. Do not discard spawn requests when activation fails; retry until success or invalid.

#### Answer (summary)

**Implemented** (shared pipeline):

- Pickup rotation **before** `maintainSpawnPopulationAhead`.
- `retainFailedSpawnRequest` for failed activations.
- Stale requests dropped via `isSpawnRequestPastDespawn`.

**Result you reported:** Cabins and obstacles healthy; **coins still broken**.

---

### Phase C — Coin-specific static trace

#### Your prompt

> Shared pipeline is fixed. First coin spawns; 3+ minutes → only one coin. Cabins OK. Investigate ONLY the coin pipeline. Does SpawnManager still create coin requests? Do they reach CoinSystem? Pending? Activated? Stale-dropped?

#### Answer (summary)

Code paths showed coins **should** keep enqueueing on rotation ticks. Likely failures: **`findClearPickupSpawn` returning null** (placement) or **intake dropping** requests (stale despawn / pool full). Needed metrics.

#### Your prompt

> Why is every coin attempt after the first failing?

#### Answer (summary)

After the first coin, **`findClearPickupSpawn`** often returned **null** because:

1. **`kindCursor` advanced even when enqueue failed** — coin turns skipped for several timer periods.
2. Pickups searched around **`SPAWN_LOOKAHEAD_DISTANCE` (600)** while obstacles filled **`POPULATION_LOOKAHEAD` (900)** — coins hunted in the **densest** band.

#### Your prompt

> Pickup search is too restrictive once the mountain is populated. Expand search (lanes + Y bands) without redesigning architecture.

#### Answer (summary)

**Expanded** `findClearPickupSpawn` with `SPAWN_PICKUP_WORLD_Y_SEARCH_BANDS`, `SPAWN_PICKUP_WORLD_Y_RETRY_STEP`, and `SPAWN_VALIDATION_PICKUP_MAX_SEARCH_ATTEMPTS` (see `GameConfig`).

**Result you reported:** Still ~**one visible coin per run** → search was **not** the only bottleneck.

---

### Phase D — Scheduling instrumentation (no gameplay logic changes)

#### Your prompt

> Static analysis limit reached. Do NOT change spawn logic, validation, search, CoinSystem, pooling, or SpawnManager logic.  
> Instrument: COIN TIMER, COIN ENQUEUE, COIN REQUEST, COIN CONSUMPTION, POOL (10s), session summary on game over.

#### Answer (summary)

Added **`src/components/ski-game/utils/coin-scheduling-debug.ts`** (`COIN_SCHEDULING_DEBUG_ENABLED = true`):

| Tag | Meaning |
|-----|---------|
| `[COIN TIMER]` | Pickup interval tick, `kindCursor`, selected kind, `pendingCount`, `canEnqueuePickup` |
| `[COIN ENQUEUE]` | `tryEnqueuePickupSpawn` for `coin`, success/failure reason |
| `[COIN REQUEST]` | New request id + world position |
| `[COIN CONSUMPTION]` | CoinSystem received / activated / retained / stale dropped / collected / despawned |
| `[COIN POOL]` | Every 10s: active coins, pending coin/obstacle counts |
| `[COIN] Debug summary` | Totals on game over |

Wired in `SpawnManager`, `CoinSystem`, `GameOverSystem`, `restart.ts`.

---

### Phase E — Definitive SpawnManager fixes (from logs + static analysis)

#### Your prompt

> No matter what I do, the coin only appears once at the start. Identify a **definitive fix** or I will delete the project.

#### Answer (summary)

**Root causes in `SpawnManager`:**

1. **`kindCursor` advanced before confirming enqueue success** — failed coin placement **consumed** the coin turn; next attempt ~4 ticks later (`SPAWN_KIND_SEQUENCE` length).
2. **Wrong pickup base Y** — used band at 600px lookahead instead of **`max(POPULATION_LOOKAHEAD, nextPatternOriginY)`** so coins searched where obstacles already crowded.

**Fixes applied:**

- **`resolvePickupBaseWorldY`** — align pickups with population lookahead / pattern cursor.
- **`tickRotatingPickupSpawn`** — always advance `kindCursor` after tick (including failed placement), but **attempt** enqueue when kind is coin/shield; obstacle steps only advance cadence.

#### Your prompt

> It working, I just see a coin at the start, that's it.

#### Answer (summary)

Further investigation: coin validation for **`findClearPickupSpawn`** uses **active obstacles only** (not pending). Pickup-before-population mitigates same-frame issues. Remaining gap pointed to **post-enqueue** behaviour.

---

### Phase F — Enqueue vs activation (runtime-isolated)

#### Your prompt

> Logs prove: timer OK, rotation OK, **11 successful coin enqueues**, **only 1 activation**. Bug is **after enqueue, before activation**. Trace **requestId 18** from write into `spawnRef.requests` through every frame until activation or drop. Do not change SpawnManager, scheduling, search, validation, pooling, timers.

#### Answer (summary)

**Lifecycle trace (requestId 18 pattern):**

1. **Enqueue** — `SpawnManager.tryEnqueuePickupSpawn` writes slot at `pendingCount`, increments id.
2. **Same frame** — `maintainSpawnPopulationAhead` may append **obstacle** requests at **later** indices; does **not** overwrite coin slot.
3. **Per fixed step order** — `ObstacleSystem` compacts queue, then **`CoinSystem`** compacts queue.
4. **Stale drop** — if `isSpawnRequestPastDespawn(engine, request.worldY, COIN_DESPAWN_MARGIN)` before activation, request is **discarded** (`logCoinStaleDropped`).
5. **Many enqueued coins** sit at **enqueue-time `worldY`** while **scroll advances**; by activation time, **`worldY` can be below the player** → `screenY` ≥ despawn line → **never visible** or **despawn same frame**.

**Not** primarily queue compaction overwriting coin rows for id 18; **timing of world Y vs scroll** at activation.

---

### Phase G — Player vs coin visibility (instrumentation)

#### Your prompt

> Stop investigating SpawnManager/queues/compaction. Activated coins may spawn **outside the playable window**.  
> For every activated coin log: requestId, coinId, playerWorldY, coin.worldY, deltaWorldY, screenY, scrollOffsetY, visibleOnScreen — every 1s until collected/despawned/deactivated.  
> Verify coordinate systems match obstacles.

#### Answer (summary)

Added **`coin-active-lifecycle-debug.ts`** (`COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED = true`):

- Logs **`[COIN LIFECYCLE]`** on activate + every 1s.
- **Verified:** `worldY` / `screenY = scrollOffsetY - worldY` matches obstacles and `coinWorldToScreenRect`.
- **Example from repro logs:** activated coin with huge **`deltaWorldY`** (~1662), **`visibleOnScreen: false`**, **`screenY` deeply negative** upstream — player never meets coin on screen.

**Fix applied (CoinSystem only):**

- **`resolveCoinActivationWorldY`** in `utils/coin-activation-world-y.ts` — at activation, if request Y is past despawn or already too far downstream in screen space, re-anchor to **`scrollOffsetY + POPULATION_LOOKAHEAD`**.

```typescript
// CoinSystem.spawnCoinFromRequest — activation uses re-anchored Y
worldY: resolveCoinActivationWorldY(engine, request.worldY),
```

**Readme** updated to document re-anchoring.

#### Your prompt

> The coin is still not appearing; for now just fix the shield overlapping grey small obstacle.

#### Answer (summary)

Work **pivoted** to shield/rock overlap (separate bug: obstacle patterns did not check pickup occupancy). Coin visibility **not re-verified** as fixed in that session.

---

## 4. Hypothesis matrix (what was ruled in or out)

| Hypothesis | Verdict | Evidence |
|------------|---------|----------|
| Broken coin animation / atlas | **Out** | First coin renders and animates. |
| Coin pool not returning slots | **Out** | `activeCount` goes 0 on collect/despawn; pool size sufficient. |
| Timer not firing | **Out** | `[COIN TIMER]` counters increment. |
| No coin enqueue attempts | **Out** | Many `[COIN ENQUEUE]` successes in logs. |
| Pending queue full | **Out** | Failures not dominated by pending cap in typical logs. |
| `findClearPickupSpawn` always null | **Partial** | Early run failures; expanded search + base Y fix reduced this; logs still showed many **successes**. |
| Queue compaction deletes coin requests | **Mostly out** | Trace for request 18; separate indices for pattern append. |
| **Stale `worldY` at activation** | **In** | screenY past despawn; lifecycle logs; simulation matched. |
| **`resolveCoinActivationWorldY` fixes visibility** | **Plausible, unconfirmed on device** | Logic sound; user still reported single coin before pivot. |

---

## 5. Code and config touched (coin-related)

| Area | File | Change |
|------|------|--------|
| Pickup base Y | `managers/SpawnManager.ts` | `resolvePickupBaseWorldY`, `POPULATION_LOOKAHEAD` |
| Rotation cadence | `managers/SpawnManager.ts` | `tickRotatingPickupSpawn` / `kindCursor` behaviour |
| Pickup search | `utils/spawn-validation.ts` | Multi-band `findClearPickupSpawn` |
| Activation Y | `utils/coin-activation-world-y.ts` | **`resolveCoinActivationWorldY`** |
| Activation | `systems/CoinSystem.ts` | Uses resolver; lifecycle debug hooks |
| Scheduling debug | `utils/coin-scheduling-debug.ts` | Temporary metrics |
| Lifecycle debug | `utils/coin-active-lifecycle-debug.ts` | Temporary player/coin distance logs |
| Shared pipeline | `utils/spawn-request-intake.ts`, systems order | Stale drop + retain failed |
| Obstacle vs pickup | `utils/spawn-validation.ts` | **`isPickupAreaOccupied`** in `findClearPatternOriginY` (protects coins from rock overlap, not coin frequency) |

**Debug flags (turn off when done):**

- `COIN_SCHEDULING_DEBUG_ENABLED`
- `COIN_ACTIVE_LIFECYCLE_DEBUG_ENABLED`

---

## 6. How to verify on a device

1. Run a 3+ minute session with Metro logs open.
2. On game over, read **`[COIN] Debug summary`**:
   - Compare **Coin enqueue successes** vs **Coin activations** vs **Coin stale drops**.
3. On each **`[COIN LIFECYCLE] activated`**, check:
   - **`visibleOnScreen`** within a few seconds of activation.
   - **`deltaWorldY`** — if thousands, coin is far upstream/downstream of player.
4. If activations ≫ 1 but **`visibleOnScreen` always false**, tune **`resolveCoinActivationWorldY`** / despawn margins (future work — not done in shield pivot).

---

## 7. Open questions

1. ~~After **`resolveCoinActivationWorldY`**, does the user still see only one coin per run on hardware?~~ **Resolved (2026-07-22):** root cause was pending-queue **reference aliasing** on compact (see §10), not activation Y alone.
2. Do **`coin stale drops`** dominate the summary? If yes, intake still sees enqueue Y as past despawn — may need enqueue-time Y alignment (without reversing “do not change SpawnManager” constraint from that phase).
3. Should coins also avoid **pending obstacle** rows like shields? (Design tradeoff; coins intentionally use active-only checks per Readme.)

---

## 10. Root cause — pending queue reference aliasing (2026-07-22)

**Symptom:** Many `[COIN REQUEST]` enqueues, **`CoinSystem` intake/activation only for the first coin**; request id 18+ never logged as received.

**Trace (request id 18, frame 428):**

| Step | Evidence |
|------|----------|
| SpawnManager | `tryEnqueuePickupSpawn('coin')` → slot 0, id 18, `pendingCount` 1 |
| Same tick | `tryEnqueuePickupSpawn('speed_boost')` → slot 1, id 19, `pendingCount` 2 |
| After pickup tick | Pending queue `[speed_boost id 19 @0, speed_boost id 19 @1]` — **no coin** |
| CoinSystem | No `coinSystemReceivedRequest` for id 18 |

**Mechanism:** Entity systems compact `spawnRef.requests` with `requests[writeIndex] = requests[readIndex]`. That leaves **two indices pointing at the same `SpawnRequest` object**. On the next coin turn, coin writes slot 0 and speed writes slot 1; when those indices alias, **speed overwrites the coin in the shared object**. The coin never reaches **CoinSystem**.

**Fix (minimal):** `cloneSpawnRequest` / `copySpawnRequestToWriteIndex` in **`spawn-request-intake.ts`**, used by all spawn-consuming systems when retaining or skipping foreign kinds. **Before:** 7 enqueues / 1 activation in headless sim. **After:** 3/3 (100% while playing).

**Not changed:** spawn cadence, pooling, obstacle spawning, rendering, validation search.

---

## 8. Shield overlap tangent (pickup context)

Investigation showed **obstacle patterns** never checked **active/pending pickups**, so a **shield** could sit at `(worldX, worldY)` and a later **`single_rock`** pattern could take the **same coordinates**. Fixed via **`isPickupAreaOccupied`** in **`findClearPatternOriginY`**. That prevents **rocks on coins**; it does **not** change coin scheduling or activation.

See [Shield overlap session](f61686cf-130c-408f-9c2d-22700fa7ea52) and `scripts/reproduce-shield-rock-overlap.ts`.

---

## 9. Related Readme sections

- **Coins** — pool, collection, renderer, `resolveCoinActivationWorldY`
- **Spawn validation** — pickup vs obstacle checks
- **Pickup scheduling** — rotation sequence and `findClearPickupSpawn` rules

---

*Document generated: 2026-07-22. Update this file when coin behaviour or fixes change.*
