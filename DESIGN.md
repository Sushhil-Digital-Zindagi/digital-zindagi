# Design Brief — Digital Zindagi + Real Human Game Module

## Direction
Brutalist cinematic post-apocalyptic action game integrated into emerald/gold branded PWA. Dark, gritty, high-contrast aesthetic. Game arena: chaos (burning wrecks, skeletons, fire). Game HUD: surgical precision (sharp-corner UI, gold/emerald chrome, bone-white critical text). Homepage featured section commands full-width attention with cinematic background + gold CTA.

## Tone
Theatrical intensity. Zero UI fluff. Environmental storytelling through visual horror (ruins, fire, mortality) balanced by sleek tactical HUD. Brand colors weaponized, not softened: emerald as military/tactical, gold as premium/authority.

## Differentiation
Chaos environment + surgical UI = player feels both overwhelmed and in control. Full-bleed homepage hero with massive cinematic background positions game as flagship attraction. Bone-white text + gold highlights cut through dark UI for clarity.

## Color Palette (OKLCH)

| Role | OKLCH | Purpose |
|---|---|---|
| Primary | 0.35 0.11 160 | Deep emerald, tactical, heritage |
| Accent (Game Gold) | 0.70 0.15 80 | CTA buttons, critical UI, premium feel |
| Fire/Warning | 0.65 0.22 50 | Environment fire, danger states, intensity |
| Dark Shadow | 0.05 0.01 0 | HUD backgrounds, near-black for clarity |
| Bone White | 0.97 0.01 100 | Critical text, health bars, stark readability |

## Typography

| Tier | Font | Use Case |
|---|---|---|
| Display | Figtree 700–900 | Game HUD labels, homepage hero CTA |
| Body | PlusJakartaSans 400–600 | Game UI text, score/status, info panels |
| Mono | System mono | Debug/admin only |

## Elevation & Depth
HUD panels: sharp 1px borders (`game-hud-bg` = near-black bg + gold border), no soft shadows. Fire elements: glow effects (`box-shadow: 0 0 20px oklch(0.65 0.22 50 / 0.4)`). Hero section: layered cinematic background with gradient overlay.

## Structural Zones

| Zone | Treatment |
|---|---|
| Header | Emerald gradient, logo + install button, no game chrome |
| Game Arena Section (Homepage) | Full-width cinematic background, centered large "PLAY REAL HUMAN" gold CTA button, 240px min-height |
| Game HUD (In-Game) | Near-black semi-transparent panels with 1px gold borders, Figtree labels, bone-white numbers |
| Footer | Emerald gradient, consistent with header |

## Spacing & Rhythm
Game HUD: compact (8px padding, 4px gaps) for readability at small scales. Homepage hero: generous (32px horizontal gutters, 64px vertical breathing room). Card radius: homepage 12px (`rounded-lg`), game UI 0–2px (sharp, tactical).

## Component Patterns
- **CTA Buttons** (Game): `.game-cta-gold` — gradient gold, box-shadow glow, border accent, hover elevation
- **HUD Panels**: `.game-hud-bg` — near-black bg + gold 1px border, high-contrast text
- **Fire Elements**: `.game-fire-glow` — orange/red gradient with inset highlight + outer glow shadow
- **Text Hierarchy**: Figtree 700 for labels, bone-white, all-caps for urgency; PlusJakartaSans 400 for secondary

## Motion
- `glow-pulse`: 2.5s infinite, gold accent glow on interactive game elements (buttons, collectibles)
- `fire-flicker`: 0.15s infinite, simulates fire intensity in environment elements
- `fade-in`: 0.4s ease-out, HUD panel reveal on game start

## Constraints
- No soft shadows in game UI (clarity over softness)
- Bone-white reserved for critical info (health, score, CTA text) — avoid for secondary info
- Gold accent max 20% of UI area — reserve for focus/CTAs
- Hero section image must be high-quality cinematic (generated preview locked in)

## Signature Detail
**"A burning empire rises from ruins."** The game's visual identity is defined by the contrast: an utterly chaotic, burning, skeletal environment rendered in vivid fire colors, anchored by a surgical, high-contrast HUD in emerald/gold/white. This tension (destruction + control) makes the game feel both intense and playable. No gradient bloat, no neon overload — precision theatrical lighting.
