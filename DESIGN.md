# Design Brief — Digital Zindagi: Chat Module + Gaming Ecosystem

## Direction
Premium super-app UI blending professional messaging (WhatsApp-adjacent but sophisticated) with gaming aesthetics. Chat prioritizes clarity and speed; gaming modules emphasize cinematic drama (Ludo luxury, action game intensity). Emerald green heritage color anchors professionalism; gold accents signal premium features and rewards. Dark/light mode supports all-day usage. **No Caffeine branding anywhere.**

## Tone
Chat: fast, clean, conversational, accessible. Gaming: theatrical, immersive, reward-focused. Unifies under one emerald/gold brand identity — "Digital Zindagi."

## Differentiation
Chat UI adapts WhatsApp's trusted patterns but embeds emerging social features (Stories, Ghost Mode, Vanish Messages, Referral Badges). Gaming UI splits between brutalist action (Real Human Game) and luxury leisure (Ludo). All modules share the same color system and typography so switching between chat, games, and marketplace feels cohesive. Golden accents reserve for earned achievements (referral badges, premium features, active stories).

## Color Palette (OKLCH) — Unified System

| Role | OKLCH | Purpose |
|---|---|---|
| **Chat Sender Bubble** | **0.35 0.11 160** | Deep emerald, continuity with brand |
| **Chat Receiver Bubble (Light)** | **0.96 0.005 150** | Near-white, soft contrast |
| **Chat Receiver Bubble (Dark)** | **0.18 0.01 150** | Dark gray in dark mode |
| **Chat Timestamp** | **0.52 0.02 150** | Muted gray-green |
| **Chat Unread Badge** | **0.35 0.11 160** | Emerald, matches sender bubble |
| **Story Ring Gold** | **0.70 0.15 80** | Premium accent, active indicator |
| **Ghost Mode Indicator** | **0.52 0.02 150** | Soft muted (privacy mode) |
| **Vanish Timer** | **0.65 0.22 50** | Warm orange-red for urgency |
| **Voice Mic (Active)** | **0.70 0.15 80** | Gold, premium voice feature |
| **Badge: Gold** | **0.72 0.16 80** | Top referrers, premium feature |
| **Badge: Silver** | **0.85 0.03 100** | Mid-tier achievers |
| **Badge: Bronze** | **0.65 0.12 50** | Warm bronze for bronze tier |
| **Vault Dark** | **0.08 0.01 0** | Near-black premium vault lock |
| **Vault Gold** | **0.72 0.16 80** | Gold frame on vault UI |
| **@Mention Highlight** | **0.85 0.15 155** | Soft emerald highlight for tags |

## Typography

| Tier | Font | Use Case |
|---|---|---|
| Display | Figtree 700–900 | Chat headers, story names, badge labels |
| Body | PlusJakartaSans 400–600 | Message text, timestamps, user info, UI labels |
| Mono | System | Admin debug only |

## Elevation & Depth
Chat bubbles: 2px blur shadow, subtle depth. Story rings: gold gradient stroke (3px) with subtle outer glow. Badges: radial gradient overlays on avatars. Ghost mode icon: semi-transparent overlay. Vanish timer: animated pulsing countdown. Vault: near-black bg with gold 1px border, PIN pad glass effect. All surfaces smooth, no flat colors.

## Structural Zones

| Zone | Treatment |
|---|---|
| **Chat Header** | Emerald gradient bar, user profile + ghost mode toggle, active story indicator |
| **Chat Bubble (Sender)** | Emerald bg, white text, right-aligned, tail pointer, 18px radius (sharp corner on tail) |
| **Chat Bubble (Receiver)** | Light gray bg (light mode) / dark gray (dark mode), dark text, left-aligned, tail pointer |
| **Story Ring** | 3px gold gradient border on circular avatar, subtle glow on active stories |
| **Unread Badge** | Circular emerald badge (20x20px) with white count, positioned top-right on chat row |
| **Bottom Navigation** | 5 items (Home, Chats, Stories, Market, Profile), emerald active indicator, mobile-first |
| **Message List Row** | Avatar + name, last message preview (truncated), timestamp right, unread badge if needed |
| **Ghost Mode Indicator** | Small ghost icon in header (semi-transparent), shows privacy status |
| **Vanish Timer** | Countdown in message bubble corner, pulsing red timer, auto-fade after 10s |
| **Referral Badges** | Bronze/Silver/Gold overlays on profile avatar, layered radial gradients |
| **Media Vault** | Dark premium folder UI, gold lock icon, PIN pad with numbers, glass effect |

## Spacing & Rhythm
Chat: compact (12px padding on bubbles, 8px gaps between messages). Message list: 16px row height, 12px horizontal gutters. Story rings: 56px diameter on mobile, 4px gap within avatar circle. Bottom nav: 56px height, 44x44px tap targets. Badges: 24px diameter, positioned top-right of avatar with -8px offset. Vault: centered modal, 40px padding, PIN pad 64x64px buttons.

## Component Patterns
- **Chat Bubble (Sender)**: `.chat-bubble-sender` — emerald bg, white text, tail on bottom-left
- **Chat Bubble (Receiver)**: `.chat-bubble-receiver` — light gray bg, dark text, tail on bottom-right, adapts in dark mode
- **Unread Badge**: `.chat-unread-badge` — emerald circle, white count, shadow emphasis
- **Story Ring**: `.chat-story-ring` — gold gradient 3px border, 50% border-radius, animate with `.animate-story-ring-glow`
- **Ghost Mode**: `.chat-ghost-indicator` — muted color, 70% opacity, ghost icon SVG
- **Vanish Timer**: `.chat-vanish-timer` — red/orange text, pulsing animation (1s loop)
- **Voice Mic**: `.chat-voice-mic` — gold color, animate with `.animate-glow-pulse` (2.5s)
- **Mention Highlight**: `.chat-mention-highlight` — soft emerald bg (15% opacity), bold text
- **Referral Badges** (Gold/Silver/Bronze): `.chat-badge-{gold|silver|bronze}` — radial gradient, positioned absolute on avatar corner

## Animations & Motion

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| Message Fade | 0.3s | ease-out | New message appearance |
| Badge Pulse | 1s | ease-in-out infinite | Referral badge attention |
| Story Ring Glow | 2s | ease-in-out infinite | Active story indicator pulse |
| Vanish Timer | 0.5s | pulse infinite | Countdown urgency (message auto-delete) |
| Voice Mic Glow | 2.5s | ease-in-out infinite | Recording indicator (reuses `glow-pulse`) |
| Unread Bounce | 0.6s | bounce | New message arrives (optional, polish) |

## Responsive Behavior
Mobile-first: 360px minimum width. Bottom navigation sticky at viewport base. Chat bubbles scale to content, max 85% viewport width. Story rings maintain 1:1 aspect ratio, scale responsively. Avatars 40x40px min (chat row), 56x56px (story/profile). Touch targets 44x44px minimum. Dark/light mode toggle in settings, persists in session. No horizontal scroll. Orientation: primarily portrait, supports landscape with UI reflow.

## Anti-Patterns Avoided
- No flat colors — all chat bubbles and badges use gradients or layered shadows
- No bold shadows on bubbles — restraint preserves readability
- No emoji-heavy UI — emerald/gold/white palette remains sophisticated
- No prototype-looking vault lock — premium glass effect with pin pad
- No missing dark mode support — all tokens adapt for night mode
- No hard-coded hex colors — all values use CSS custom properties

## Key Design Tokens Used (Chat Module)

**CSS Custom Properties:**
- `--chat-bubble-sender`, `--chat-bubble-receiver`, `--chat-text-sender`, `--chat-text-receiver`
- `--chat-story-ring-gold`, `--chat-timestamp`, `--chat-unread-badge`
- `--chat-ghost-mode`, `--chat-vanish-timer`, `--chat-voice-mic`
- `--chat-badge-gold`, `--chat-badge-silver`, `--chat-badge-bronze`
- `--chat-vault-dark`, `--chat-vault-gold`, `--chat-mention-highlight`

**Utility Classes:**
- `.chat-bubble-sender`, `.chat-bubble-receiver` — message bubble styling
- `.chat-story-ring` — active story avatar ring
- `.chat-unread-badge` — notification count circle
- `.chat-ghost-indicator` — privacy mode icon
- `.chat-vanish-timer` — pulsing countdown
- `.chat-voice-mic` — gold recording indicator
- `.chat-badge-{gold|silver|bronze}` — referral tier badges
- `.chat-vault-dark` — premium vault container
- `.chat-mention-highlight` — @mention text styling

**Animations:**
- `.animate-message-fade` — message list entry (0.3s)
- `.animate-badge-pulse` — badge arrival (1s infinite)
- `.animate-story-ring-glow` — active story glow (2s infinite)
- `.animate-glow-pulse` — voice mic (2.5s, reused from ludo)

**Box Shadows:**
- `shadow-chat-bubble-sender` — emerald bubble depth
- `shadow-chat-bubble-receiver` — receiver bubble depth
- `shadow-chat-unread` — badge emphasis
- `shadow-chat-story-ring` — story ring halo

## Implementation Notes
- OKLCH only — no hex/rgb mixing
- All chat bubbles use consistent tail styling (border-radius manipulation or SVG)
- Story rings: CSS `border-image` gradient or SVG stroke (recommended: SVG for smoother gradient)
- Badges: positioned `absolute` on avatar corner with transform-origin
- Vault: modal overlay, PIN pad buttons 64x64px, glass effect via `backdrop-filter: blur(10px)` + semi-transparent bg
- Message polling: 3–5 second refresh for real-time feel (native websockets not available on platform)
- Voice-to-text: Web Speech API for Hindi/Hinglish support
- No video upload — video share via YouTube link only
- File share: up to 20MB via object-storage extension, Key-Locker optional feature

## Constraints
- Emerald primary (`0.35 0.11 160`) — unchanged from app identity
- Gold accent reserved for premium features (stories, badges, referral, voice) — max 15% UI area
- Chat bubbles: no transparency on bubble bg (solid color for readability)
- Dark mode: all text must maintain WCAG AA contrast (4.5:1 ratio)
- Portrait orientation prioritized for mobile chat UX

## Signature Detail
**"Emerald trust, gold achievement."** Chat UI earns user trust through clarity and speed (clean bubbles, clear timestamps, obvious read status). Gaming and social features (stories, badges, referral) celebrate achievement with gold accents, creating a reward loop that makes the app feel progressive. The combination of professional messaging + playful social + premium gaming makes Digital Zindagi feel like a super-app, not a toolkit.
