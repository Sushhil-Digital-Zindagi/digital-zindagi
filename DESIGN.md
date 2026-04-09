# Design Brief — Digital Zindagi + Real Human Game Module + Ludo Premium

## Direction
Brutalist cinematic post-apocalyptic action game integrated into emerald/gold branded PWA. Dark, gritty, high-contrast aesthetic. Game arena: chaos (burning wrecks, skeletons, fire). Game HUD: surgical precision (sharp-corner UI, gold/emerald chrome, bone-white critical text). **Ludo Module**: Luxury gaming UI inspired by Ludo King. Premium, sophisticated board with crystal glass finish, soft gradients, royal gold frame, and realistic 3D token effects. Portrait orientation only.

## Tone
Theatrical intensity for action game. **Ludo**: Elegant restraint. Zero UI fluff. Environmental storytelling through visual horror (ruins, fire, mortality) balanced by sleek tactical HUD. Brand colors weaponized, not softened: emerald as military/tactical, gold as premium/authority. **Ludo**: Deep emerald + polished gold. Crystal clarity. Professional gaming experience, not prototype.

## Differentiation
Chaos environment + surgical UI = player feels both overwhelmed and in control. Full-bleed homepage hero with massive cinematic background positions game as flagship attraction. Bone-white text + gold highlights cut through dark UI for clarity. **Ludo**: Premium board finish mimics Ludo King. Glossy 3D dice, realistic pawn shadows, smooth animations, royal center frame. Every surface has depth—gradients, layered shadows, glass effects.

## Color Palette (OKLCH)

| Role | OKLCH | Purpose |
|---|---|---|
| Primary | 0.35 0.11 160 | Deep emerald, tactical, heritage |
| Accent (Game Gold) | 0.70 0.15 80 | CTA buttons, critical UI, premium feel |
| Fire/Warning | 0.65 0.22 50 | Environment fire, danger states, intensity |
| Dark Shadow | 0.05 0.01 0 | HUD backgrounds, near-black for clarity |
| Bone White | 0.97 0.01 100 | Critical text, health bars, stark readability |
| **Ludo Board Light** | **0.98 0.02 90** | **Board background gradient base** |
| **Ludo Board Dark** | **0.92 0.03 80** | **Board gradient shadow, depth** |
| **Ludo Gold Primary** | **0.72 0.16 80** | **Frame, buttons, branding** |
| **Ludo Token Emerald** | **0.32 0.1 162** | **Home zone, player accent** |
| **Ludo Token Sapphire** | **0.35 0.12 285** | **Player 2 token color** |
| **Ludo Token Coral** | **0.48 0.15 20** | **Player 3 token color** |
| **Ludo Token Amber** | **0.58 0.14 68** | **Player 4 token color** |

## Typography

| Tier | Font | Use Case |
|---|---|---|
| Display | Figtree 700–900 | Game HUD labels, homepage hero CTA, Ludo title |
| Body | PlusJakartaSans 400–600 | Game UI text, score/status, info panels, Ludo turn indicators |
| Mono | System mono | Debug/admin only |

## Elevation & Depth
HUD panels: sharp 1px borders (`game-hud-bg` = near-black bg + gold border), no soft shadows. Fire elements: glow effects (`box-shadow: 0 0 20px oklch(0.65 0.22 50 / 0.4)`). Hero section: layered cinematic background with gradient overlay. **Ludo**: Layered shadows—outer (depth), inset (glass effect), subtle highlights. Board: soft cream-to-warm-gold gradients (135°). Dice: radial sphere gradient. Tokens: realistic drop shadows (6px blur). All surfaces polished, no flat colors.

## Structural Zones

| Zone | Treatment |
|---|---|
| Header | Emerald gradient, logo + install button, no game chrome |
| Game Arena Section (Homepage) | Full-width cinematic background, centered large "PLAY REAL HUMAN" gold CTA button, 240px min-height |
| Game HUD (In-Game) | Near-black semi-transparent panels with 1px gold borders, Figtree labels, bone-white numbers |
| **Ludo Header** | **Emerald gradient bar with gold Digital Zindagi logo, turn player info** |
| **Ludo Board** | **Crystal glass finish, rounded corners (20px), soft gradients, centered royal gold frame with profile photo** |
| **Ludo Dice** | **Glossy 3D effect, rounded 12px, premium shadows, smooth 0.8s roll animation** |
| **Ludo Token Zones** | **Radial gradient spheres per player color, realistic shadows, smooth jump animations (0.6s)** |
| Footer | Emerald gradient, consistent with header, AdMob banner space |

## Spacing & Rhythm
Game HUD: compact (8px padding, 4px gaps) for readability at small scales. Homepage hero: generous (32px horizontal gutters, 64px vertical breathing room). Card radius: homepage 12px (`rounded-lg`), game UI 0–2px (sharp, tactical). **Ludo**: Balanced spacing around board (32px gutters), dice area above board (16px gap), token zones 20px radius corners.

## Component Patterns
- **CTA Buttons** (Game): `.game-cta-gold` — gradient gold, box-shadow glow, border accent, hover elevation
- **HUD Panels**: `.game-hud-bg` — near-black bg + gold 1px border, high-contrast text
- **Fire Elements**: `.game-fire-glow` — orange/red gradient with inset highlight + outer glow shadow
- **Text Hierarchy**: Figtree 700 for labels, bone-white, all-caps for urgency; PlusJakartaSans 400 for secondary
- **Ludo Board**: `.ludo-board-premium` — soft gradient, inset + outer shadows, glass border
- **Ludo Dice**: `.ludo-dice-premium` — radial sphere, multi-layered shadows, 0.8s roll animation
- **Ludo Tokens**: `.ludo-token-[color]` — radial gradients per player, 6px drop shadows, arc jump animation
- **Ludo Gold Frame**: `.ludo-gold-frame` — gradient frame, subtle shimmer animation (2s), profile photo center

## Animations & Motion
Game: sharp cuts, no ease-out on impacts. Ludo: smooth, fluid, premium feel.

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| Dice Roll | 0.8s | cubic-bezier(0.25, 0.46, 0.45, 0.94) | Realistic multi-axis tumble |
| Pawn Jump | 0.6s | cubic-bezier(0.34, 1.56, 0.64, 1) | Arc landing, elastic bounce |
| Gold Shimmer | 2s | ease-in-out infinite | Frame subtle glow pulse |

## Responsive Behavior
Game: full viewport minus header/footer. Ludo: **Portrait-only orientation enforced** (mobile gaming standard). Board scales to fill safe area proportionally. Dice & tokens maintain 1:1 aspect, scale with board. Touch targets minimum 44x44px (accessibility). No horizontal scroll. Viewport lock active.

## Anti-Patterns Avoided
- No flat colors — all surfaces have gradients or layered shadows
- No hard angles on tokens or dice — min 8px border-radius
- No prototype look — every element polished with depth cues
- No heavy shadows — professional restraint over cartoonish effects
- No portrait orientation errors — landscape lock prevented for Ludo gaming UX

## Key Design Tokens Used (Ludo)
- `--ludo-board-light`, `--ludo-board-dark` → gradient base
- `--ludo-gold-primary`, `--ludo-gold-light` → branding & frames
- `--ludo-token-shadow` → realistic pawn depth
- `--ludo-emerald-accent`, `--ludo-sapphire-token`, `--ludo-coral-token`, `--ludo-amber-token` → player identities
- Utility classes: `.ludo-board-premium`, `.ludo-dice-premium`, `.ludo-token-emerald/sapphire/coral/amber`, `.ludo-gold-frame`
- Animations: `.animate-ludo-dice-roll`, `.animate-ludo-pawn-jump`, `.animate-ludo-gold-shimmer`
- Box shadows: `shadow-ludo-board`, `shadow-ludo-dice`, `shadow-ludo-token`, `shadow-ludo-gold`

## Implementation Notes
- All colors use OKLCH (no hex/rgb mixins)
- Animations defined in tailwind.config.js keyframes, consumed via Tailwind utility classes
- Box shadows in tailwind config as `ludo-board`, `ludo-dice`, `ludo-token`, `ludo-gold`
- Portrait orientation lock: CSS @media (prefers-portrait) + JS window.matchMedia listener
- No Three.js — pure CSS + Canvas 2D for game logic (performance optimized for mobile)
- Ludo board: 15x15 grid, cells 40-50px on mobile, responsive scaling
- Tokens: 28-32px diameter on mobile, scale proportionally
- Dice: 60x60px standard, CSS transforms for roll animation

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
