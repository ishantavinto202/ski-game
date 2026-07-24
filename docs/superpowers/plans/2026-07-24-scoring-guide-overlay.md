# Scoring Guide Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a data-driven SCORING GUIDE overlay (opened via an **i** button on Pause and Game Over) that documents real Ski Game collectibles, boosters, and obstacles using existing assets and config values.

**Architecture:** Local `useState` inside `PauseOverlay` and `GameOverOverlay` toggles a shared `ScoringGuideOverlay`. Guide rows come from `scoring-guide-data.ts`, which reads `COIN_COLLECT_SCORE`, `OBSTACLE_CONSEQUENCES`, and `GAME_CONFIG` — presentation only; no engine or gameplay changes.

**Tech Stack:** Expo ~53, React 19, React Native 0.79, TypeScript ~5.8, `react-native-safe-area-context`, `React.memo` / `useCallback` / `useMemo`, existing ski-game UI patterns. No new dependencies. No Jest suite in this repo — verify with `npx tsc --noEmit` and `npx expo lint`.

**Spec:** `docs/superpowers/specs/2026-07-24-scoring-guide-overlay-design.md`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| Create `src/components/ski-game/ui/ScoringGuideTypes.ts` | Types + layout constants for guide UI |
| Create `src/components/ski-game/ui/scoring-guide-data.ts` | 9 data-driven entries; formats effects from config |
| Create `src/components/ski-game/ui/ScoringGuideRow.tsx` | Memoized row (asset preview + copy + effects) |
| Create `src/components/ski-game/ui/ScoringGuideOverlay.tsx` | Scrim, header, ScrollView sections |
| Create `src/components/ski-game/ui/ScoringGuideInfoButton.tsx` | Shared **i** button |
| Modify `src/components/ski-game/ui/PauseOverlay.tsx` | Wire **i** + local guide open state |
| Modify `src/components/ski-game/ui/GameOverOverlay.tsx` | Wire **i** + local guide open state |
| Modify `src/components/ski-game/ui/index.ts` | Export new UI modules |
| Modify `src/components/ski-game/index.ts` | Re-export overlay / types if public API consistent |

**Do not modify:** GameLoop, GameEngine, CollisionSystem, HealthSystem, ShieldSystem behavior, SpeedBoostSystem, ObstacleSystem, CoinSystem, SpawnManager, `OBSTACLE_ASSET_SCALE`, score mechanics.

---

### Task 1: ScoringGuideTypes

**Files:**
- Create: `src/components/ski-game/ui/ScoringGuideTypes.ts`

- [ ] **Step 1: Create types and layout constants**

```ts
import type { ImageSourcePropType } from 'react-native';

export type ScoringGuideEffectTone = 'positive' | 'negative' | 'neutral';

export type ScoringGuideAssetFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  atlasW: number;
  atlasH: number;
};

export type ScoringGuideItem = {
  id: string;
  category: 'collectible' | 'obstacle';
  title: string;
  description: string;
  asset: ImageSourcePropType;
  assetFrame?: ScoringGuideAssetFrame;
  primaryEffect: string;
  secondaryEffect?: string;
  effectTone: ScoringGuideEffectTone;
};

export type ScoringGuideOverlayProps = {
  onClose: () => void;
};

export type ScoringGuideInfoButtonProps = {
  onPress: () => void;
};

export const SCORING_GUIDE_PREVIEW_SIZE = 70;
export const SCORING_GUIDE_OVERLAY_Z_INDEX = 50;
export const SCORING_GUIDE_INFO_BUTTON_SIZE = 44;
```

- [ ] **Step 2: Verify TypeScript accepts the new file**

Run: `npx tsc --noEmit`
Expected: PASS (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add src/components/ski-game/ui/ScoringGuideTypes.ts
git commit -m "$(cat <<'EOF'
Add scoring guide UI types and layout constants.

EOF
)"
```

---

### Task 2: scoring-guide-data (config-driven entries)

**Files:**
- Create: `src/components/ski-game/ui/scoring-guide-data.ts`

- [ ] **Step 1: Create helper formatters + both item arrays**

Read atlas frame `1.png` and meta sizes from:

- Coin: `assets/assets/Coin Animations/texture.json` → frame `{x:0,y:248,w:259,h:248}`, atlas `1036×1240`
- Shield: `assets/assets/Shield Animations/shield-sprite.json` → frame `{x:179,y:0,w:179,h:196}`, atlas `895×980`
- Speed boost: `assets/assets/Thunder Animations/speed-boost-sprite.json` → frame `{x:174,y:0,w:174,h:258}`, atlas `1044×1032`

```ts
import type { ImageSourcePropType } from 'react-native';

import {
  cabinAsset,
  largeBoulderAsset,
  smallRockAsset,
  treeStumpAsset,
  treeVisualAssets,
  woodenFenceAsset,
} from '../utils/obstacle-assets';
import { GAME_CONFIG } from '../utils/GameConfig';
import {
  COIN_COLLECT_SCORE,
  OBSTACLE_CONSEQUENCES,
  type ObstacleConsequence,
} from '../utils/score-consequences';

import type { ScoringGuideItem } from './ScoringGuideTypes';

const COIN_ATLAS = require('../../../../assets/assets/Coin Animations/texture.png') as number;
const SHIELD_ATLAS =
  require('../../../../assets/assets/Shield Animations/shield-sprite.png') as number;
const SPEED_BOOST_ATLAS =
  require('../../../../assets/assets/Thunder Animations/speed-boost-sprite.png') as number;

function formatScoreDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

function formatDurationSec(durationMs: number): string {
  const seconds = Math.round(durationMs / 1000);
  return `${seconds} SEC`;
}

function formatSpeedMultiplier(multiplier: number): string {
  const text = Number.isInteger(multiplier)
    ? `${multiplier}`
    : multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}× SPEED`;
}

function formatObstacleEffects(consequence: ObstacleConsequence): {
  primaryEffect: string;
  secondaryEffect?: string;
  effectTone: 'negative';
} {
  const scoreText = formatScoreDelta(consequence.scoreDelta);
  if (consequence.healthDamage > 0) {
    return {
      primaryEffect: scoreText,
      secondaryEffect: `♥ -${consequence.healthDamage}`,
      effectTone: 'negative',
    };
  }
  return {
    primaryEffect: scoreText,
    secondaryEffect: 'SCORE',
    effectTone: 'negative',
  };
}

const shieldDurationLabel = formatDurationSec(GAME_CONFIG.SHIELD_DURATION_MS);
const boostDurationLabel = formatDurationSec(GAME_CONFIG.SPEED_BOOST_DURATION_MS);
const boostMultiplierLabel = formatSpeedMultiplier(GAME_CONFIG.SPEED_BOOST_MULTIPLIER);

export const COLLECTIBLE_GUIDE_ITEMS: readonly ScoringGuideItem[] = [
  {
    id: 'coin',
    category: 'collectible',
    title: 'Coin',
    description: 'Collect for score',
    asset: COIN_ATLAS as ImageSourcePropType,
    assetFrame: { x: 0, y: 248, w: 259, h: 248, atlasW: 1036, atlasH: 1240 },
    primaryEffect: formatScoreDelta(COIN_COLLECT_SCORE),
    secondaryEffect: 'SCORE',
    effectTone: 'positive',
  },
  {
    id: 'shield',
    category: 'collectible',
    title: 'Shield',
    description: 'Protects you from a hit',
    asset: SHIELD_ATLAS as ImageSourcePropType,
    assetFrame: { x: 179, y: 0, w: 179, h: 196, atlasW: 895, atlasH: 980 },
    primaryEffect: 'BLOCKS 1 HIT',
    secondaryEffect: shieldDurationLabel,
    effectTone: 'neutral',
  },
  {
    id: 'speed_boost',
    category: 'collectible',
    title: 'Speed Boost',
    description: 'Temporary downhill speed boost',
    asset: SPEED_BOOST_ATLAS as ImageSourcePropType,
    assetFrame: { x: 174, y: 0, w: 174, h: 258, atlasW: 1044, atlasH: 1032 },
    primaryEffect: boostMultiplierLabel,
    secondaryEffect: boostDurationLabel,
    effectTone: 'positive',
  },
];

const smallRockEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.small_rock);
const largeBoulderEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.large_boulder);
const treeEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.tree);
const treeStumpEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.tree_stump);
const cabinEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.cabin);
const woodenFenceEffects = formatObstacleEffects(OBSTACLE_CONSEQUENCES.wooden_fence);

export const OBSTACLE_GUIDE_ITEMS: readonly ScoringGuideItem[] = [
  {
    id: 'small_rock',
    category: 'obstacle',
    title: 'Small Rock',
    description: 'Small snow-covered hazard',
    asset: smallRockAsset as ImageSourcePropType,
    primaryEffect: smallRockEffects.primaryEffect,
    secondaryEffect: smallRockEffects.secondaryEffect,
    effectTone: smallRockEffects.effectTone,
  },
  {
    id: 'large_boulder',
    category: 'obstacle',
    title: 'Large Boulder',
    description: 'Large mountain obstacle',
    asset: largeBoulderAsset as ImageSourcePropType,
    primaryEffect: largeBoulderEffects.primaryEffect,
    secondaryEffect: largeBoulderEffects.secondaryEffect,
    effectTone: largeBoulderEffects.effectTone,
  },
  {
    id: 'tree',
    category: 'obstacle',
    title: 'Tree',
    description: 'Avoid the alpine trees',
    asset: treeVisualAssets[0] as ImageSourcePropType,
    primaryEffect: treeEffects.primaryEffect,
    secondaryEffect: treeEffects.secondaryEffect,
    effectTone: treeEffects.effectTone,
  },
  {
    id: 'tree_stump',
    category: 'obstacle',
    title: 'Tree Stump',
    description: 'Low snow-covered obstacle',
    asset: treeStumpAsset as ImageSourcePropType,
    primaryEffect: treeStumpEffects.primaryEffect,
    secondaryEffect: treeStumpEffects.secondaryEffect,
    effectTone: treeStumpEffects.effectTone,
  },
  {
    id: 'cabin',
    category: 'obstacle',
    title: 'Cabin',
    description: 'Large mountain obstacle',
    asset: cabinAsset as ImageSourcePropType,
    primaryEffect: cabinEffects.primaryEffect,
    secondaryEffect: cabinEffects.secondaryEffect,
    effectTone: cabinEffects.effectTone,
  },
  {
    id: 'wooden_fence',
    category: 'obstacle',
    title: 'Wooden Fence',
    description: 'Blocks part of your route',
    asset: woodenFenceAsset as ImageSourcePropType,
    primaryEffect: woodenFenceEffects.primaryEffect,
    secondaryEffect: woodenFenceEffects.secondaryEffect,
    effectTone: woodenFenceEffects.effectTone,
  },
];

export const SCORING_GUIDE_ITEM_COUNT =
  COLLECTIBLE_GUIDE_ITEMS.length + OBSTACLE_GUIDE_ITEMS.length;
```

- [ ] **Step 2: Sanity-check derived values against sources**

Confirm by reading the file / console mental check:

| Entry | Expected |
|-------|----------|
| Coin primary | `+20` from `COIN_COLLECT_SCORE` |
| Shield secondary | `4 SEC` from `SHIELD_DURATION_MS` |
| Speed Boost | `1.75× SPEED` + `4 SEC` |
| small_rock | `-15` + `SCORE` |
| large_boulder | `-30` + `♥ -1` |
| tree | `-25` + `♥ -1` |
| tree_stump | `-20` + `SCORE` |
| cabin | `-50` + `♥ -2` |
| wooden_fence | `-35` + `♥ -1` |
| `SCORING_GUIDE_ITEM_COUNT` | `9` |

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS for these files

- [ ] **Step 4: Commit**

```bash
git add src/components/ski-game/ui/scoring-guide-data.ts
git commit -m "$(cat <<'EOF'
Add config-driven scoring guide item data.

EOF
)"
```

---

### Task 3: ScoringGuideRow

**Files:**
- Create: `src/components/ski-game/ui/ScoringGuideRow.tsx`

- [ ] **Step 1: Implement memoized row with atlas / object-inset preview**

```tsx
import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ScoringGuideItem } from './ScoringGuideTypes';
import { SCORING_GUIDE_PREVIEW_SIZE } from './ScoringGuideTypes';

const EFFECT_COLOR = {
  positive: '#4ADE80',
  negative: '#F87171',
  neutral: '#E2E8F0',
} as const;

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
  },
  previewBox: {
    width: SCORING_GUIDE_PREVIEW_SIZE,
    height: SCORING_GUIDE_PREVIEW_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClip: {
    width: SCORING_GUIDE_PREVIEW_SIZE,
    height: SCORING_GUIDE_PREVIEW_SIZE,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  effects: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 72,
    gap: 2,
  },
  primaryEffect: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryEffect: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

type ScoringGuideRowProps = {
  item: ScoringGuideItem;
  isLastInSection: boolean;
};

export const ScoringGuideRow = memo(function ScoringGuideRow({
  item,
  isLastInSection,
}: ScoringGuideRowProps) {
  const effectColor = EFFECT_COLOR[item.effectTone];

  const preview = useMemo(() => {
    if (item.assetFrame) {
      const { x, y, w, h, atlasW, atlasH } = item.assetFrame;
      const scale = Math.min(SCORING_GUIDE_PREVIEW_SIZE / w, SCORING_GUIDE_PREVIEW_SIZE / h);
      const displayW = w * scale;
      const displayH = h * scale;
      return (
        <View style={rowStyles.previewClip}>
          <Image
            source={item.asset}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              width: atlasW * scale,
              height: atlasH * scale,
              left: -x * scale + (SCORING_GUIDE_PREVIEW_SIZE - displayW) / 2,
              top: -y * scale + (SCORING_GUIDE_PREVIEW_SIZE - displayH) / 2,
            }}
          />
        </View>
      );
    }

    // Obstacle PNGs: contain inside the fixed preview box (presentation only).
    return (
      <Image
        source={item.asset}
        resizeMode="contain"
        style={{ width: SCORING_GUIDE_PREVIEW_SIZE, height: SCORING_GUIDE_PREVIEW_SIZE }}
      />
    );
  }, [item]);

  return (
    <View style={[rowStyles.card, !isLastInSection ? { marginBottom: 8 } : null]}>
      <View style={rowStyles.previewBox}>{preview}</View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={rowStyles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View style={rowStyles.effects}>
        <Text style={[rowStyles.primaryEffect, { color: effectColor }]}>{item.primaryEffect}</Text>
        {item.secondaryEffect ? (
          <Text style={[rowStyles.secondaryEffect, { color: effectColor }]}>
            {item.secondaryEffect}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
```

**Note:** Obstacle previews use `resizeMode="contain"` only — do not change gameplay asset layouts.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/ski-game/ui/ScoringGuideRow.tsx
git commit -m "$(cat <<'EOF'
Add ScoringGuideRow for guide item presentation.

EOF
)"
```

---

### Task 4: ScoringGuideOverlay + ScoringGuideInfoButton

**Files:**
- Create: `src/components/ski-game/ui/ScoringGuideOverlay.tsx`
- Create: `src/components/ski-game/ui/ScoringGuideInfoButton.tsx`

- [ ] **Step 1: Create Info button**

```tsx
import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ScoringGuideInfoButtonProps } from './ScoringGuideTypes';
import { SCORING_GUIDE_INFO_BUTTON_SIZE } from './ScoringGuideTypes';

const infoStyles = StyleSheet.create({
  hit: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: SCORING_GUIDE_INFO_BUTTON_SIZE,
    height: SCORING_GUIDE_INFO_BUTTON_SIZE,
    borderRadius: SCORING_GUIDE_INFO_BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#1D3557',
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D3557',
    lineHeight: 20,
  },
});

export const ScoringGuideInfoButton = memo(function ScoringGuideInfoButton({
  onPress,
}: ScoringGuideInfoButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scoring Guide"
      hitSlop={8}
      onPress={onPress}
      style={infoStyles.hit}
    >
      <Text style={infoStyles.label}>i</Text>
    </Pressable>
  );
});
```

- [ ] **Step 2: Create ScoringGuideOverlay**

```tsx
import { memo, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLLECTIBLE_GUIDE_ITEMS, OBSTACLE_GUIDE_ITEMS } from './scoring-guide-data';
import { ScoringGuideRow } from './ScoringGuideRow';
import type { ScoringGuideOverlayProps } from './ScoringGuideTypes';
import { SCORING_GUIDE_OVERLAY_Z_INDEX } from './ScoringGuideTypes';

const overlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: SCORING_GUIDE_OVERLAY_Z_INDEX,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  panel: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#F8FAFC',
    paddingHorizontal: 44,
  },
  closeHit: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E2E8F0',
    lineHeight: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 8,
  },
  sectionLabel: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#7DD3FC',
  },
});

export const ScoringGuideOverlay = memo(function ScoringGuideOverlay({
  onClose,
}: ScoringGuideOverlayProps) {
  const insets = useSafeAreaInsets();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panelStyle = useMemo(
    () => [
      overlayStyles.panel,
      {
        marginTop: Math.max(insets.top, 12) + 8,
        marginBottom: Math.max(insets.bottom, 12) + 8,
      },
    ],
    [insets.bottom, insets.top],
  );

  const scrollContentStyle = useMemo(
    () => [overlayStyles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }],
    [insets.bottom],
  );

  return (
    <View style={overlayStyles.root} pointerEvents="auto">
      <View style={overlayStyles.scrim} pointerEvents="none" />
      <View style={panelStyle}>
        <View style={overlayStyles.header}>
          <Text style={overlayStyles.title}>SCORING GUIDE</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scoring guide"
            hitSlop={10}
            onPress={handleClose}
            style={overlayStyles.closeHit}
          >
            <Text style={overlayStyles.closeLabel}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          style={overlayStyles.scroll}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator
        >
          <Text style={overlayStyles.sectionLabel}>COLLECTIBLES & BOOSTERS</Text>
          {COLLECTIBLE_GUIDE_ITEMS.map((item, index) => (
            <ScoringGuideRow
              key={item.id}
              item={item}
              isLastInSection={index === COLLECTIBLE_GUIDE_ITEMS.length - 1}
            />
          ))}
          <Text style={overlayStyles.sectionLabel}>OBSTACLES</Text>
          {OBSTACLE_GUIDE_ITEMS.map((item, index) => (
            <ScoringGuideRow
              key={item.id}
              item={item}
              isLastInSection={index === OBSTACLE_GUIDE_ITEMS.length - 1}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/ski-game/ui/ScoringGuideOverlay.tsx src/components/ski-game/ui/ScoringGuideInfoButton.tsx
git commit -m "$(cat <<'EOF'
Add ScoringGuideOverlay and info button components.

EOF
)"
```

---

### Task 5: Wire PauseOverlay

**Files:**
- Modify: `src/components/ski-game/ui/PauseOverlay.tsx`

- [ ] **Step 1: Add local guide state + i button + overlay**

Update imports and component body:

```tsx
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
// ...existing reanimated imports...

import { ScoringGuideInfoButton } from './ScoringGuideInfoButton';
import { ScoringGuideOverlay } from './ScoringGuideOverlay';
// ...existing PauseTypes imports...
```

Inside `PauseOverlay`:

```tsx
const [isScoringGuideOpen, setIsScoringGuideOpen] = useState(false);

const handleOpenScoringGuide = useCallback(() => {
  setIsScoringGuideOpen(true);
}, []);

const handleCloseScoringGuide = useCallback(() => {
  setIsScoringGuideOpen(false);
}, []);
```

Make the panel `position: 'relative'` (or wrap content) so the absolute **i** button anchors to the panel. Render:

```tsx
<View style={overlayStyles.panel}>
  <ScoringGuideInfoButton onPress={handleOpenScoringGuide} />
  <Text style={overlayStyles.title}>PAUSED</Text>
  {/* existing Resume / Quit */}
</View>
{isScoringGuideOpen ? <ScoringGuideOverlay onClose={handleCloseScoringGuide} /> : null}
```

**Critical:** Do not call `requestResumeGame` when opening/closing the guide. Keep existing Resume/Quit handlers unchanged.

Also update `panel` style to include `position: 'relative'` and enough top padding so the title does not collide with the **i** button (e.g. `paddingTop: 28` or keep title centered with horizontal room).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/ski-game/ui/PauseOverlay.tsx
git commit -m "$(cat <<'EOF'
Wire Scoring Guide into PauseOverlay via info button.

EOF
)"
```

---

### Task 6: Wire GameOverOverlay

**Files:**
- Modify: `src/components/ski-game/ui/GameOverOverlay.tsx`

- [ ] **Step 1: Mirror Pause wiring**

Same pattern:

```tsx
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScoringGuideInfoButton } from './ScoringGuideInfoButton';
import { ScoringGuideOverlay } from './ScoringGuideOverlay';
```

```tsx
const [isScoringGuideOpen, setIsScoringGuideOpen] = useState(false);
const handleOpenScoringGuide = useCallback(() => setIsScoringGuideOpen(true), []);
const handleCloseScoringGuide = useCallback(() => setIsScoringGuideOpen(false), []);
```

```tsx
<View style={overlayStyles.panel}>
  <ScoringGuideInfoButton onPress={handleOpenScoringGuide} />
  <Text style={overlayStyles.title}>GAME OVER</Text>
  {/* existing stats + Play Again / Quit */}
</View>
{isScoringGuideOpen ? <ScoringGuideOverlay onClose={handleCloseScoringGuide} /> : null}
```

Do not call `playAgain` or quit handlers from guide open/close. `position: 'relative'` on panel.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/ski-game/ui/GameOverOverlay.tsx
git commit -m "$(cat <<'EOF'
Wire Scoring Guide into GameOverOverlay via info button.

EOF
)"
```

---

### Task 7: Exports + final verification

**Files:**
- Modify: `src/components/ski-game/ui/index.ts`
- Modify: `src/components/ski-game/index.ts`

- [ ] **Step 1: Export from ui/index.ts**

Append:

```ts
export { ScoringGuideOverlay } from './ScoringGuideOverlay';
export { ScoringGuideInfoButton } from './ScoringGuideInfoButton';
export { ScoringGuideRow } from './ScoringGuideRow';
export { COLLECTIBLE_GUIDE_ITEMS, OBSTACLE_GUIDE_ITEMS } from './scoring-guide-data';
export type {
  ScoringGuideItem,
  ScoringGuideOverlayProps,
  ScoringGuideInfoButtonProps,
  ScoringGuideEffectTone,
} from './ScoringGuideTypes';
```

- [ ] **Step 2: Re-export from ski-game/index.ts**

Extend the existing UI export line to include `ScoringGuideOverlay` (and optionally `ScoringGuideInfoButton`). Extend type exports for `ScoringGuideOverlayProps` if other overlay props are public.

Example addition to the UI export list:

```ts
ScoringGuideOverlay,
ScoringGuideInfoButton,
```

And types:

```ts
export type { ..., ScoringGuideOverlayProps } from './ui';
```

- [ ] **Step 3: Run verification commands**

```bash
npx tsc --noEmit
npx expo lint
```

Expected: both succeed (no new errors from guide files).

- [ ] **Step 4: Manual checklist (device / simulator)**

1. Play → Pause → tap **i** → guide opens; state stays paused (snow/world frozen)
2. Scroll through all 9 rows; safe area OK at top/bottom
3. Tap **X** → back to Pause; Resume still works
4. Die → Game Over → **i** → guide → **X** → still Game Over; Play Again / Quit unchanged
5. Confirm Coin shows `+20`, Shield `BLOCKS 1 HIT` / `4 SEC`, Boost `1.75× SPEED` / `4 SEC`
6. Confirm obstacle penalties match `OBSTACLE_CONSEQUENCES` (including cabin `♥ -2`)

- [ ] **Step 5: Commit exports**

```bash
git add src/components/ski-game/ui/index.ts src/components/ski-game/index.ts
git commit -m "$(cat <<'EOF'
Export Scoring Guide UI from ski-game public modules.

EOF
)"
```

- [ ] **Step 6: Fill implementation report** (in PR/chat reply)

Answer all 10 checklist items from the design spec Verification section.

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|------------------|------|
| **i** on Pause + Game Over | Tasks 5–6 |
| Local React boolean; no engine state | Tasks 5–6 |
| Guide above overlay; close returns underneath | Tasks 4–6 |
| Data-driven 9 entries | Task 2 |
| Real assets / atlas frame 1 / Tree 1 only | Task 2 |
| Values from `COIN_COLLECT_SCORE`, `OBSTACLE_CONSEQUENCES`, `GAME_CONFIG` | Task 2 |
| Dark navy scrollable safe-area overlay | Task 4 |
| `ScoringGuideRow` reusable | Task 3 |
| No gameplay system changes | Explicit in File Structure |
| `tsc` + `expo lint` | Task 7 |
| Exports via ui + ski-game index | Task 7 |

## Placeholder / consistency check

- No TBD/TODO left in tasks
- Types in Task 1 match usage in Tasks 2–4
- Effect labels derived from config formatters in Task 2
- Obstacle keys use `wooden_fence` (matches `ObstacleVariant`)
