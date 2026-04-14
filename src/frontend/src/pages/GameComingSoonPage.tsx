/**
 * LudoGamePage — Digital Zindagi FINAL PREMIUM BUILD
 * Ludo King-level quality: full-screen, 3D glossy dice, arc-jump animations,
 * crystal glass board, Web Audio SFX, portrait lock, fixed ad banner.
 */
import { ArrowLeft, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ContentLockerOverlay from "../components/ContentLockerOverlay";
import InterstitialAd from "../components/InterstitialAd";
import { useContentLockerConfig } from "../hooks/useQueries";
import { useNavigate } from "../lib/router";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow"] as const;
type ColorName = (typeof COLOR_NAMES)[number];

const TOKEN_GRADIENTS: Record<ColorName, string> = {
  Red: "radial-gradient(circle at 35% 35%, #ff9999 0%, #ff3333 45%, #8b0000 100%)",
  Blue: "radial-gradient(circle at 35% 35%, #99aaff 0%, #3355ff 45%, #001088 100%)",
  Green:
    "radial-gradient(circle at 35% 35%, #99ee99 0%, #22bb22 45%, #005500 100%)",
  Yellow:
    "radial-gradient(circle at 35% 35%, #ffee88 0%, #ffcc00 45%, #886600 100%)",
};

const HOME_ZONE_GRADIENTS: Record<string, string> = {
  "home-red": "linear-gradient(135deg, #ff6b6b 0%, #cc0000 50%, #8b0000 100%)",
  "home-blue": "linear-gradient(135deg, #6699ff 0%, #0033cc 50%, #001088 100%)",
  "home-green":
    "linear-gradient(135deg, #66ee88 0%, #006622 50%, #003311 100%)",
  "home-yellow":
    "linear-gradient(135deg, #ffee66 0%, #cc8800 50%, #886600 100%)",
};

const LANE_GRADIENTS: Record<string, string> = {
  "col-blue": "linear-gradient(180deg, #d0e0ff 0%, #a8c0ff 100%)",
  "row-red": "linear-gradient(90deg, #ffd0d0 0%, #ffa8a8 100%)",
  "col-yellow": "linear-gradient(180deg, #fff8d0 0%, #ffe888 100%)",
  "row-green": "linear-gradient(90deg, #d0ffd8 0%, #a8ffb8 100%)",
};

// 52-step shared path [row, col] on 15x15 grid (0-indexed), clockwise
const SHARED_PATH: [number, number][] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 5],
  [4, 5],
  [3, 5],
  [2, 5],
  [1, 5],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 6],
  [14, 5],
  [13, 5],
  [12, 5],
  [11, 5],
  [10, 5],
  [9, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
];

const ENTRY_INDEX: Record<ColorName, number> = {
  Red: 0,
  Blue: 13,
  Green: 26,
  Yellow: 39,
};

const HOME_PATH: Record<ColorName, [number, number][]> = {
  Red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  Blue: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  Green: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  Yellow: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};

const BASE_POSITIONS: Record<ColorName, [number, number][]> = {
  Red: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  Blue: [
    [1, 11],
    [1, 13],
    [3, 11],
    [3, 13],
  ],
  Green: [
    [11, 11],
    [11, 13],
    [13, 11],
    [13, 13],
  ],
  Yellow: [
    [11, 1],
    [11, 3],
    [13, 1],
    [13, 3],
  ],
};

const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Token {
  pos: number;
}
interface Player {
  color: ColorName;
  name: string;
  tokens: Token[];
  active: boolean;
}
type GamePhase = "disclaimer" | "setup" | "playing" | "winner";

// ─── Fair Dice Roll ─────────────────────────────────────────────────────────

function fairDiceRoll(): number {
  // Use crypto.getRandomValues for unbiased 1-6
  try {
    const arr = new Uint8Array(1);
    let val: number;
    do {
      crypto.getRandomValues(arr);
      val = arr[0]! & 0xff;
    } while (val >= 252); // discard to avoid modulo bias (252 = 42*6)
    return (val % 6) + 1;
  } catch {
    return Math.floor(Math.random() * 6) + 1;
  }
}

// ─── Web Audio SFX ───────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function playDiceSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const noise = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.5);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  noise.type = "square";
  noise.frequency.setValueAtTime(80, t);
  osc.connect(gain);
  noise.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.55);
  noise.start(t);
  noise.stop(t + 0.2);
}

function playMoveSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}

function playCaptureSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

function playWinSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [261.63, 329.63, 392, 523.25]; // C4-E4-G4-C5
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTokenCell(color: ColorName, token: Token): [number, number] | null {
  if (token.pos === 0 || token.pos >= 59) return null;
  if (token.pos <= 52) {
    const sharedIdx = (ENTRY_INDEX[color] + token.pos - 1) % 52;
    return SHARED_PATH[sharedIdx] ?? null;
  }
  return HOME_PATH[color][token.pos - 53] ?? null;
}

function canCapture(color: ColorName, pathPos: number): boolean {
  const sharedIdx = (ENTRY_INDEX[color] + pathPos - 1) % 52;
  return pathPos >= 1 && pathPos <= 52 && !SAFE_INDICES.has(sharedIdx);
}

// ─── CSS Keyframes ─────────────────────────────────────────────────────────────

const LUDO_KEYFRAMES = `
@keyframes ludoDiceShake {
  0%   { transform: translateX(0)   translateY(0)   rotateZ(0deg)   scale(1); }
  10%  { transform: translateX(-6px) translateY(-4px) rotateZ(-8deg) scale(1.05); }
  20%  { transform: translateX(6px)  translateY(-6px) rotateZ(10deg)  scale(1.08); }
  30%  { transform: translateX(-5px) translateY(4px)  rotateZ(-6deg) scale(1.05); }
  40%  { transform: translateX(5px)  translateY(-5px) rotateZ(8deg)   scale(1.1); }
  50%  { transform: translateX(-4px) translateY(3px)  rotateZ(-5deg) scale(1.08); }
  60%  { transform: translateX(4px)  translateY(-4px) rotateZ(6deg)   scale(1.05); }
  70%  { transform: translateX(-3px) translateY(2px)  rotateZ(-3deg) scale(1.03); }
  80%  { transform: translateX(3px)  translateY(-2px) rotateZ(2deg)   scale(1.02); }
  90%  { transform: translateX(-1px) translateY(1px)  rotateZ(-1deg) scale(1.01); }
  100% { transform: translateX(0)   translateY(0)   rotateZ(0deg)   scale(1); }
}
@keyframes ludoTokenArcJump {
  0%   { transform: translateY(0)   scale(1); }
  25%  { transform: translateY(-20px) scale(1.15); }
  50%  { transform: translateY(-35px) scale(1.2); }
  75%  { transform: translateY(-10px) scale(1.05); }
  100% { transform: translateY(0)   scale(1); }
}
@keyframes ludoRollPulse {
  0%, 100% { box-shadow: 0 8px 24px rgba(255,165,0,0.6), 0 0 0 0 rgba(255,215,0,0.4), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2); }
  50%      { box-shadow: 0 12px 32px rgba(255,165,0,0.8), 0 0 0 10px rgba(255,215,0,0), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2); }
}
@keyframes ludoTokenPulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,255,255,0.7); }
  50%      { box-shadow: 0 6px 18px rgba(0,0,0,0.8), 0 0 0 3px rgba(255,255,255,1); }
}
@keyframes ludoGoldShimmer {
  0%,100% { box-shadow: 0 0 12px rgba(255,215,0,0.6), 0 0 24px rgba(255,215,0,0.3), 0 0 0 3px rgba(255,165,0,0.5); }
  50%     { box-shadow: 0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.5), 0 0 0 4px rgba(255,165,0,0.7); }
}
@keyframes ludoLandBounce {
  0%   { transform: scale(1.0); }
  35%  { transform: scale(1.35); }
  65%  { transform: scale(0.9); }
  85%  { transform: scale(1.08); }
  100% { transform: scale(1.0); }
}
@keyframes dicePulseRed {
  0%,100% { box-shadow: 0 0 8px 2px #ef4444, 0 4px 16px rgba(0,0,0,0.6); }
  50%     { box-shadow: 0 0 24px 8px #ef4444, 0 4px 24px rgba(0,0,0,0.7); }
}
@keyframes dicePulseBlue {
  0%,100% { box-shadow: 0 0 8px 2px #3b82f6, 0 4px 16px rgba(0,0,0,0.6); }
  50%     { box-shadow: 0 0 24px 8px #3b82f6, 0 4px 24px rgba(0,0,0,0.7); }
}
@keyframes dicePulseGreen {
  0%,100% { box-shadow: 0 0 8px 2px #22c55e, 0 4px 16px rgba(0,0,0,0.6); }
  50%     { box-shadow: 0 0 24px 8px #22c55e, 0 4px 24px rgba(0,0,0,0.7); }
}
@keyframes dicePulseYellow {
  0%,100% { box-shadow: 0 0 8px 2px #eab308, 0 4px 16px rgba(0,0,0,0.6); }
  50%     { box-shadow: 0 0 24px 8px #eab308, 0 4px 24px rgba(0,0,0,0.7); }
}
@keyframes ludoWinnerGlow {
  0%,100% { text-shadow: 0 0 10px rgba(255,215,0,0.8), 0 0 20px rgba(255,165,0,0.5); }
  50%     { text-shadow: 0 0 20px rgba(255,215,0,1), 0 0 40px rgba(255,165,0,0.8), 0 0 60px rgba(255,100,0,0.4); }
}
`;

function StyleInjector() {
  useEffect(() => {
    const id = "ludo-premium-keyframes";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = LUDO_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);
  return null;
}

// ─── Dice dot positions (x%, y%) for each face ───────────────────────────────

const DOT_POSITIONS: [number, number][][] = [
  [],
  [[50, 50]],
  [
    [30, 30],
    [70, 70],
  ],
  [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  [
    [30, 22],
    [70, 22],
    [30, 50],
    [70, 50],
    [30, 78],
    [70, 78],
  ],
];

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = DOT_POSITIONS[value] ?? [];
  return (
    <div
      style={{ perspective: "300px", width: 68, height: 68, flexShrink: 0 }}
      aria-label={`Dice shows ${value}`}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          borderRadius: "14px",
          background:
            "radial-gradient(circle at 30% 25%, #ffffff 0%, #f5f5f5 40%, #e0e0e0 100%)",
          boxShadow: [
            "0 8px 28px rgba(0,0,0,0.65)",
            "0 2px 6px rgba(0,0,0,0.4)",
            "inset 0 3px 5px rgba(255,255,255,0.95)",
            "inset 0 -3px 5px rgba(0,0,0,0.18)",
            "0 0 0 2px rgba(200,200,200,0.5)",
            "inset -3px -3px 6px rgba(0,0,0,0.1)",
          ].join(", "),
          border: "1px solid rgba(180,180,180,0.7)",
          animation: rolling ? "ludoDiceShake 0.65s ease-out" : "none",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* Top-left gloss sheen */}
        <div
          style={{
            position: "absolute",
            top: 5,
            left: 5,
            width: "42%",
            height: "32%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.92) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        {/* Bottom-right dark edge */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: "35%",
            height: "28%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 70% 70%, rgba(0,0,0,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        {/* Dots */}
        {dots.map(([x, y]) => (
          <div
            key={`d-${x}-${y}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: "19%",
              height: "19%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 30%, #444, #111 60%, #000)",
              transform: "translate(-50%, -50%)",
              boxShadow:
                "inset 0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Cell background helper ───────────────────────────────────────────────────

function getCellType(row: number, col: number): string {
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
    return row === 7 && col === 7 ? "center-star" : "center";
  }
  if (row <= 5 && col <= 5) return "home-red";
  if (row <= 5 && col >= 9) return "home-blue";
  if (row >= 9 && col >= 9) return "home-green";
  if (row >= 9 && col <= 5) return "home-yellow";
  if (col === 7 && row >= 1 && row <= 5) return "col-blue";
  if (row === 7 && col >= 1 && col <= 5) return "row-red";
  if (col === 7 && row >= 9 && row <= 13) return "col-yellow";
  if (row === 7 && col >= 9 && col <= 13) return "row-green";
  const si = SHARED_PATH.findIndex(([r, c]) => r === row && c === col);
  if (si >= 0 && SAFE_INDICES.has(si)) return "safe";
  return "path";
}

function getCellStyle(type: string): React.CSSProperties {
  const glassBase: React.CSSProperties = {
    boxShadow:
      "inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.2)",
    borderRadius: "2px",
  };
  if (HOME_ZONE_GRADIENTS[type]) {
    return {
      ...glassBase,
      background: HOME_ZONE_GRADIENTS[type],
      boxShadow:
        "inset 0 2px 6px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)",
    };
  }
  if (LANE_GRADIENTS[type]) {
    return { ...glassBase, background: LANE_GRADIENTS[type] };
  }
  switch (type) {
    case "safe":
      return {
        ...glassBase,
        background:
          "linear-gradient(135deg, #fffde0 0%, #fff6a0 50%, #ffe566 100%)",
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(180,140,0,0.3), 0 0 6px rgba(255,215,0,0.3)",
      };
    case "center":
      return {
        background:
          "linear-gradient(135deg, #064e35 0%, #065f46 50%, #047857 100%)",
        boxShadow:
          "inset 0 2px 4px rgba(16,185,129,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)",
      };
    case "center-star":
      return {
        background:
          "linear-gradient(135deg, #064e35 0%, #065f46 50%, #047857 100%)",
        boxShadow:
          "inset 0 2px 6px rgba(255,215,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.5)",
      };
    default:
      return {
        background:
          "linear-gradient(135deg, #fafaf8 0%, #f2f2ee 50%, #e8e8e4 100%)",
        boxShadow:
          "inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.1)",
        borderRadius: "2px",
      };
  }
}

// ─── Portrait Lock Hook ───────────────────────────────────────────────────────

function usePortraitLock() {
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    try {
      (screen.orientation as unknown as { lock: (t: string) => Promise<void> })
        .lock("portrait-primary")
        .catch(() => {});
    } catch {}
    return () => window.removeEventListener("resize", check);
  }, []);
  return isLandscape;
}

// ─── Fullscreen Hook ──────────────────────────────────────────────────────────

function useFullscreen(
  containerRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (el && document.fullscreenEnabled) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [active, containerRef]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameComingSoonPage() {
  const { data: lockerConfig } = useContentLockerConfig();
  return (
    <ContentLockerOverlay featureName="Game" config={lockerConfig}>
      <LudoGameInner />
    </ContentLockerOverlay>
  );
}

function LudoGameInner() {
  const navigate = useNavigate();
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  const [ludoEnabled, setLudoEnabled] = useState<boolean>(
    () =>
      localStorage.getItem("dz_ludo_enabled") !== "false" &&
      localStorage.getItem("dz_game_visible") !== "false",
  );

  const admobConfig = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("dz_admob_config") ?? "{}",
      ) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  })();
  const bannerUnitId = admobConfig.ludoBannerId ?? admobConfig.bannerId ?? "";

  // Listen for admin real-time toggle updates
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ key: string; value: unknown }>;
      if (ev.detail?.key === "ludoEnabled") {
        const val = Boolean(ev.detail.value);
        setLudoEnabled(val);
        if (!val) navigate("/");
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dz_ludo_enabled" || e.key === "dz_game_visible") {
        const enabled =
          localStorage.getItem("dz_ludo_enabled") !== "false" &&
          localStorage.getItem("dz_game_visible") !== "false";
        setLudoEnabled(enabled);
        if (!enabled) navigate("/");
      }
    };
    window.addEventListener("dz_settings_update", handleSettingsUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("dz_settings_update", handleSettingsUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate]);

  const [phase, setPhase] = useState<GamePhase>(() =>
    localStorage.getItem("dz_ludo_disclaimer_accepted") === "true"
      ? "setup"
      : "disclaimer",
  );
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState([
    "Aap",
    "Player 2",
    "Player 3",
    "Player 4",
  ]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [diceRolled, setDiceRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showWinnerScreen, setShowWinnerScreen] = useState(false);
  const [message, setMessage] = useState("");
  const [landedToken, setLandedToken] = useState<string | null>(null);
  const [jumpingToken, setJumpingToken] = useState<string | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTurnRef = useRef<((lastDice: number) => void) | null>(null);

  const isLandscape = usePortraitLock();
  const isPlaying =
    phase === "playing" && !showInterstitial && !showWinnerScreen;
  useFullscreen(gameContainerRef, isPlaying);

  useEffect(
    () => () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    },
    [],
  );

  const nextTurn = useCallback(
    (lastDice: number) => {
      setDiceRolled(false);
      setMovableTokens([]);
      if (lastDice === 6) {
        setPlayers((prev) => {
          const p = prev[currentPlayerIdx];
          if (p) setMessage(`${p.name} ko 6 aaya! Ek aur chance! 🎲`);
          return prev;
        });
      } else {
        setPlayers((prev) => {
          const nextIdx = (currentPlayerIdx + 1) % prev.length;
          const next = prev[nextIdx];
          if (next) {
            setCurrentPlayerIdx(nextIdx);
            setMessage(`${next.name} ki baari! 🎯`);
          }
          return prev;
        });
      }
    },
    [currentPlayerIdx],
  );

  useEffect(() => {
    nextTurnRef.current = nextTurn;
  }, [nextTurn]);

  useEffect(() => {
    if (!diceRolled || players.length === 0) return;
    const p = players[currentPlayerIdx];
    if (!p) return;
    const movable: number[] = [];
    for (let i = 0; i < p.tokens.length; i++) {
      const t = p.tokens[i];
      if (!t || t.pos === 59) continue;
      if (t.pos === 0 && diceValue === 6) {
        movable.push(i);
        continue;
      }
      if (t.pos === 0) continue;
      if (t.pos + diceValue <= 59) movable.push(i);
    }
    setMovableTokens(movable);
    if (movable.length === 0) {
      setMessage(`${p.name} ka koi token nahi chala. Pass. ⏩`);
      rollTimeoutRef.current = setTimeout(
        () => nextTurnRef.current?.(diceValue),
        1500,
      );
    }
  }, [diceRolled, diceValue, players, currentPlayerIdx]);

  const acceptDisclaimer = () => {
    localStorage.setItem("dz_ludo_disclaimer_accepted", "true");
    setPhase("setup");
  };

  const startGame = () => {
    const newPlayers: Player[] = COLOR_NAMES.slice(0, numPlayers).map(
      (color, i) => ({
        color,
        name: playerNames[i] || `Player ${i + 1}`,
        tokens: [{ pos: 0 }, { pos: 0 }, { pos: 0 }, { pos: 0 }],
        active: i === 0,
      }),
    );
    setPlayers(newPlayers);
    setCurrentPlayerIdx(0);
    setDiceValue(1);
    setDiceRolled(false);
    setMovableTokens([]);
    setWinner(null);
    setShowWinnerScreen(false);
    setShowInterstitial(false);
    setMessage(`${newPlayers[0]?.name ?? "Player 1"} ki baari! 🎲`);
    setPhase("playing");
  };

  const rollDice = useCallback(() => {
    if (diceRolled || rolling) return;
    // Unlock audio on user gesture
    getAudioCtx();
    // Haptic feedback
    try {
      navigator.vibrate?.([50, 30, 50]);
    } catch {}
    setRolling(true);
    setMessage("");
    let flickCount = 0;
    const anim = setInterval(() => {
      setDiceValue(fairDiceRoll());
      flickCount++;
      if (flickCount > 12) clearInterval(anim);
    }, 55);
    rollTimeoutRef.current = setTimeout(() => {
      clearInterval(anim);
      const val = fairDiceRoll();
      setDiceValue(val);
      setRolling(false);
      setDiceRolled(true);
      playDiceSound();
    }, 700);
  }, [diceRolled, rolling]);

  const moveToken = useCallback(
    (tokenIdx: number) => {
      if (!diceRolled) return;
      const p = players[currentPlayerIdx];
      if (!p) return;
      const tokenKey = `${p.color}-${tokenIdx}`;
      // Arc jump animation
      setJumpingToken(tokenKey);
      setTimeout(() => {
        setJumpingToken(null);
        setLandedToken(tokenKey);
        setTimeout(() => setLandedToken(null), 400);
      }, 500);
      playMoveSound();

      setPlayers((prev) => {
        const updated: Player[] = prev.map((pl) => ({
          ...pl,
          tokens: pl.tokens.map((tk) => ({ ...tk })),
        }));
        const player = updated[currentPlayerIdx];
        if (!player) return prev;
        const token = player.tokens[tokenIdx];
        if (!token) return prev;
        let newPos = token.pos;
        if (token.pos === 0 && diceValue === 6) newPos = 1;
        else if (token.pos > 0 && token.pos + diceValue <= 59)
          newPos = token.pos + diceValue;
        player.tokens[tokenIdx] = { pos: newPos };
        // Capture
        if (newPos >= 1 && newPos <= 52 && canCapture(player.color, newPos)) {
          const myCell = getTokenCell(player.color, { pos: newPos });
          if (myCell) {
            for (let oi = 0; oi < updated.length; oi++) {
              if (oi === currentPlayerIdx) continue;
              const other = updated[oi];
              if (!other) continue;
              for (let oti = 0; oti < other.tokens.length; oti++) {
                const ot = other.tokens[oti];
                if (!ot || ot.pos <= 0 || ot.pos > 52) continue;
                const oCell = getTokenCell(other.color, ot);
                if (oCell && myCell[0] === oCell[0] && myCell[1] === oCell[1]) {
                  other.tokens[oti] = { pos: 0 };
                  playCaptureSound();
                  setMessage(
                    `${player.name} ne ${other.name} ka token capture kiya! 🎯`,
                  );
                }
              }
            }
          }
        }
        // Win check
        if (updated[currentPlayerIdx]?.tokens.every((t) => t.pos === 59)) {
          const w = updated[currentPlayerIdx];
          if (w) {
            setWinner(w);
            playWinSound();
            setShowInterstitial(true);
          }
        }
        return updated;
      });

      setDiceRolled(false);
      setMovableTokens([]);
      if (diceValue !== 6) {
        setPlayers((prev) => {
          const nextIdx = (currentPlayerIdx + 1) % prev.length;
          const next = prev[nextIdx];
          if (next) {
            setCurrentPlayerIdx(nextIdx);
            setMessage(`${next.name} ki baari! 🎯`);
          }
          return prev;
        });
      } else {
        setPlayers((prev) => {
          const pl = prev[currentPlayerIdx];
          if (pl) setMessage(`${pl.name} ko 6! Ek aur chance! 🎲`);
          return prev;
        });
      }
    },
    [diceRolled, diceValue, currentPlayerIdx, players],
  );

  const cellTokens = useCallback(
    (row: number, col: number): { color: ColorName; tokenIdx: number }[] => {
      const result: { color: ColorName; tokenIdx: number }[] = [];
      for (const p of players) {
        for (let ti = 0; ti < p.tokens.length; ti++) {
          const t = p.tokens[ti];
          if (!t) continue;
          if (t.pos === 0) {
            if (
              BASE_POSITIONS[p.color].some(([r, c]) => r === row && c === col)
            )
              result.push({ color: p.color, tokenIdx: ti });
            continue;
          }
          if (t.pos >= 59) continue;
          const cell = getTokenCell(p.color, t);
          if (cell && cell[0] === row && cell[1] === col)
            result.push({ color: p.color, tokenIdx: ti });
        }
      }
      return result;
    },
    [players],
  );

  const isMovableToken = useCallback(
    (color: ColorName, tokenIdx: number): boolean => {
      const p = players[currentPlayerIdx];
      return !!p && p.color === color && movableTokens.includes(tokenIdx);
    },
    [players, currentPlayerIdx, movableTokens],
  );

  // ─── Disabled ────────────────────────────────────────────────────────────────
  if (!ludoEnabled) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          background: "linear-gradient(160deg, #0a2e1a 0%, #051208 100%)",
        }}
        data-ocid="game.disabled_screen"
      >
        <div className="text-5xl mb-4">🎮</div>
        <h2 className="text-white text-xl font-bold mb-2">Game Section</h2>
        <p className="text-emerald-400/70 text-sm mb-6">
          Game section admin ne band kar rakha hai.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-emerald-400 hover:text-white py-2 px-4 rounded-xl border border-emerald-700 transition-colors"
          data-ocid="game.exit_btn"
        >
          <ArrowLeft size={16} /> Home Jaao
        </button>
      </div>
    );
  }

  // ─── Landscape Rotate Warning ─────────────────────────────────────────────
  if (isLandscape && phase === "playing") {
    return (
      <div
        className="ludo-game-container"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background:
            "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 64 }}>📱</div>
        <p
          style={{
            color: "white",
            fontSize: "1.3rem",
            fontWeight: 700,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          Please rotate your device to play Digital Zindagi
        </p>
        <p
          style={{
            color: "rgba(255,215,0,0.8)",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          Portrait mode mein khelen
        </p>
      </div>
    );
  }

  // ─── 18+ Disclaimer ──────────────────────────────────────────────────────────
  if (phase === "disclaimer") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(160deg, #0a2e1a 0%, #051208 100%)",
        }}
        data-ocid="game.disclaimer_screen"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-6 space-y-5"
          style={{
            background: "rgba(10,20,30,0.95)",
            border: "1px solid rgba(255,215,0,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}
        >
          <div className="text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-white font-bold text-xl">
              18+ Legal Disclaimer
            </h2>
            <p className="text-emerald-300 text-sm mt-1">कानूनी अस्वीकरण</p>
          </div>
          <div
            className="rounded-2xl p-4 space-y-2 text-sm text-white/80 leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p>यह game सिर्फ मनोरंजन के लिए है।</p>
            <p>इसमें real money gambling नहीं है।</p>
            <p>इस game को खेलने के लिए आपकी उम्र 18 वर्ष या उससे अधिक होनी चाहिए।</p>
            <p className="text-white/40 text-xs mt-2">
              This game is for entertainment only. You must be 18+.
            </p>
          </div>
          <label
            htmlFor="disclaimer-check"
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              id="disclaimer-check"
              type="checkbox"
              checked={disclaimerChecked}
              onChange={(e) => setDisclaimerChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded cursor-pointer flex-shrink-0"
              style={{ accentColor: "#10b981" }}
              data-ocid="game.disclaimer_checkbox"
            />
            <span className="text-white/80 text-sm">
              मैं 18+ हूँ और उपरोक्त शर्तों से सहमत हूँ
            </span>
          </label>
          <button
            type="button"
            disabled={!disclaimerChecked}
            onClick={acceptDisclaimer}
            data-ocid="game.disclaimer_accept_btn"
            className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95"
            style={{
              background: disclaimerChecked
                ? "linear-gradient(135deg, #065f46, #10b981)"
                : "rgba(60,60,60,0.5)",
              opacity: disclaimerChecked ? 1 : 0.5,
              cursor: disclaimerChecked ? "pointer" : "not-allowed",
              boxShadow: disclaimerChecked
                ? "0 6px 20px rgba(16,185,129,0.4)"
                : "none",
            }}
          >
            ✅ Accept &amp; Continue
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-2 text-emerald-400/70 text-sm hover:text-emerald-400 transition-colors"
          >
            Wapas Jaao
          </button>
        </div>
      </div>
    );
  }

  // ─── Player Setup ─────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(160deg, #0a2e1a 0%, #051208 100%)",
        }}
        data-ocid="game.setup_screen"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-6 space-y-5"
          style={{
            background: "rgba(10,20,30,0.95)",
            border: "1px solid rgba(255,215,0,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-emerald-400 hover:text-white transition-colors p-1"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-white font-bold text-xl">🎲 Ludo</h1>
              <p
                className="text-xs font-black tracking-widest"
                style={{
                  background:
                    "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "2px",
                  filter: "drop-shadow(0 0 6px rgba(255,215,0,0.6))",
                }}
              >
                Digital Zindagi
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/rewards-wallet")}
              className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors text-xs font-semibold"
              data-ocid="game.wallet_btn"
            >
              <Wallet size={16} /> Wallet
            </button>
          </div>
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-3">
              Kitne Khiladi? (2-4)
            </p>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumPlayers(n)}
                  data-ocid={`game.player_count_${n}`}
                  className="flex-1 py-3 rounded-xl font-bold text-base transition-all"
                  style={{
                    background:
                      numPlayers === n
                        ? "linear-gradient(135deg, #065f46, #10b981)"
                        : "rgba(40,40,50,0.8)",
                    color: numPlayers === n ? "white" : "#9ca3af",
                    boxShadow:
                      numPlayers === n
                        ? "0 4px 14px rgba(16,185,129,0.4)"
                        : "none",
                    border:
                      numPlayers === n
                        ? "1px solid rgba(16,185,129,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-emerald-300 text-sm font-semibold">
              Khiladi ke Naam
            </p>
            {COLOR_NAMES.slice(0, numPlayers).map((color, i) => (
              <div key={color} className="flex items-center gap-3">
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: TOKEN_GRADIENTS[color],
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  }}
                />
                <input
                  type="text"
                  value={playerNames[i] ?? ""}
                  onChange={(e) => {
                    const n = [...playerNames];
                    n[i] = e.target.value;
                    setPlayerNames(n);
                  }}
                  placeholder={`${color} Player`}
                  maxLength={12}
                  className="flex-1 text-white rounded-xl px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "rgba(40,40,50,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  data-ocid={`game.player_name_${i}`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={startGame}
            data-ocid="game.start_btn"
            className="w-full py-4 rounded-full font-black text-lg transition-all active:scale-95 active:translate-y-0.5"
            style={{
              background:
                "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B00 100%)",
              boxShadow:
                "0 10px 28px rgba(255,165,0,0.55), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2)",
              color: "#1a0a00",
              textShadow: "0 1px 2px rgba(255,255,255,0.3)",
              letterSpacing: "0.5px",
            }}
          >
            🎮 Game Shuru Karein!
          </button>
        </div>
      </div>
    );
  }

  // ─── Interstitial Ad ──────────────────────────────────────────────────────────
  if (showInterstitial && winner) {
    return (
      <InterstitialAd
        phase="post"
        adBlocked={false}
        customAds={[]}
        onClose={() => {
          setShowInterstitial(false);
          setShowWinnerScreen(true);
        }}
      />
    );
  }

  // ─── Winner Screen ────────────────────────────────────────────────────────────
  if (showWinnerScreen && winner) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{
          background: "linear-gradient(160deg, #0a2e1a 0%, #051208 100%)",
        }}
        data-ocid="game.winner_screen"
      >
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏆</div>
        <h1
          style={{
            color: "#FFD700",
            fontWeight: 900,
            fontSize: "2rem",
            marginBottom: 8,
            animation: "ludoWinnerGlow 2s ease-in-out infinite",
          }}
        >
          Mubarak ho!
        </h1>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: TOKEN_GRADIENTS[winner.color],
            margin: "8px auto",
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
          }}
        />
        <p className="text-white font-bold text-2xl">{winner.name}</p>
        <p className="text-emerald-400 text-sm mt-1">
          {winner.color} Team — Winner!
        </p>
        <p style={{ color: "#FFD700", fontWeight: 700, marginTop: 12 }}>
          +50 Points Earn! 🥇
        </p>
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={startGame}
            data-ocid="game.play_again_btn"
            className="w-full py-3.5 rounded-full font-black text-lg active:translate-y-0.5 transition-all"
            style={{
              background:
                "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B00 100%)",
              boxShadow:
                "0 8px 24px rgba(255,165,0,0.55), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2)",
              color: "#1a0a00",
            }}
          >
            🔄 Dobara Khelo
          </button>
          <button
            type="button"
            onClick={() => navigate("/rewards-wallet")}
            data-ocid="game.wallet_link_btn"
            className="w-full py-3 rounded-2xl font-bold transition-colors"
            style={{
              color: "#FFD700",
              border: "1px solid rgba(255,215,0,0.4)",
              background: "rgba(255,215,0,0.07)",
            }}
          >
            <Wallet size={16} className="inline mr-1" />
            Wallet Dekhein
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3 text-emerald-400/70 text-sm hover:text-emerald-400 transition-colors"
          >
            Home Jaao
          </button>
        </div>
      </div>
    );
  }

  // ─── Playing Screen ───────────────────────────────────────────────────────────
  const currentPlayer = players[currentPlayerIdx];
  const canRoll = !diceRolled && !rolling;

  // Dice corner position per player index
  // Players: 0=Red(bottom-left), 1=Blue(top-left), 2=Green(top-right), 3=Yellow(bottom-right)
  const DICE_CORNERS: React.CSSProperties[] = [
    { bottom: "8px", left: "8px", top: "auto", right: "auto" }, // 0 Red — bottom-left
    { top: "8px", left: "8px", bottom: "auto", right: "auto" }, // 1 Blue — top-left
    { top: "8px", right: "8px", bottom: "auto", left: "auto" }, // 2 Green — top-right
    { bottom: "8px", right: "8px", top: "auto", left: "auto" }, // 3 Yellow — bottom-right
  ];

  const DICE_PULSE_ANIM: Record<ColorName, string> = {
    Red: "dicePulseRed 1.4s ease-in-out infinite",
    Blue: "dicePulseBlue 1.4s ease-in-out infinite",
    Green: "dicePulseGreen 1.4s ease-in-out infinite",
    Yellow: "dicePulseYellow 1.4s ease-in-out infinite",
  };

  const PLAYER_HEX: Record<ColorName, string> = {
    Red: "#ef4444",
    Blue: "#3b82f6",
    Green: "#22c55e",
    Yellow: "#eab308",
  };

  const activeDiceCorner = DICE_CORNERS[currentPlayerIdx] ?? DICE_CORNERS[0]!;
  const activeColor = currentPlayer?.color ?? "Red";
  const activePulse = canRoll ? DICE_PULSE_ANIM[activeColor] : "none";
  const activeHex = PLAYER_HEX[activeColor];

  return (
    <div
      ref={gameContainerRef}
      data-ocid="game.playing_screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background:
          "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 70px)", // safe area + space for fixed ad banner
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        width: "100vw",
        height: "100vh",
      }}
    >
      <StyleInjector />

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          flexShrink: 0,
          background: "rgba(0,0,0,0.55)",
          borderBottom: "1px solid rgba(255,215,0,0.15)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement)
              document.exitFullscreen().catch(() => {});
            navigate("/");
          }}
          className="text-emerald-400 hover:text-white transition-colors p-2 rounded-xl"
          aria-label="Exit game"
          data-ocid="game.exit_btn"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <p
          style={{
            fontWeight: 900,
            fontSize: "0.9rem",
            letterSpacing: "2px",
            background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 8px rgba(255,215,0,0.7))",
          }}
        >
          🎲 Digital Zindagi Ludo
        </p>
        <button
          type="button"
          onClick={() => navigate("/rewards-wallet")}
          className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors text-xs font-semibold"
          data-ocid="game.wallet_header_btn"
          style={{
            background: "rgba(255,215,0,0.1)",
            border: "1px solid rgba(255,215,0,0.25)",
            padding: "6px 10px",
            borderRadius: 10,
          }}
        >
          <Wallet size={13} /> Wallet
        </button>
      </div>

      {/* ── Player turn indicators ── */}
      <div
        style={{ display: "flex", gap: 6, padding: "8px 12px", flexShrink: 0 }}
      >
        {players.map((p, i) => {
          const isActive = i === currentPlayerIdx;
          return (
            <div
              key={p.color}
              data-ocid={`game.player_indicator_${i}`}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: 12,
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 700,
                transition: "all 0.3s ease",
                background: isActive
                  ? TOKEN_GRADIENTS[p.color]
                  : "rgba(40,40,50,0.7)",
                color: isActive ? "white" : "rgba(180,180,180,0.6)",
                boxShadow: isActive
                  ? "0 4px 14px rgba(0,0,0,0.5), 0 0 8px rgba(255,215,0,0.2)"
                  : "none",
                transform: isActive ? "scale(1.06)" : "scale(1)",
                border: isActive
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isActive
                    ? "rgba(255,255,255,0.9)"
                    : TOKEN_GRADIENTS[p.color],
                  margin: "0 auto 2px",
                  boxShadow: isActive
                    ? "0 0 4px rgba(255,255,255,0.8)"
                    : "none",
                }}
              />
              {p.name.slice(0, 7)}
            </div>
          );
        })}
      </div>

      {/* ── Message ── */}
      {message && (
        <div
          style={{ padding: "2px 16px", flexShrink: 0, textAlign: "center" }}
        >
          <p style={{ color: "#86efac", fontSize: "11px", fontWeight: 600 }}>
            {message}
          </p>
        </div>
      )}

      {/* ── Board (with absolute dice overlay) ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 8px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Board wrapper: relative container so dice overlay can position against it */}
        <div
          data-ocid="game.board_wrapper"
          style={{
            position: "relative",
            width: "min(calc(100vw - 16px), calc(100vh - 180px))",
            height: "min(calc(100vw - 16px), calc(100vh - 180px))",
            borderRadius: "12px",
            border: "3px solid rgba(255,215,0,0.4)",
            boxShadow: [
              "0 0 40px rgba(255,215,0,0.22)",
              "0 12px 50px rgba(0,0,0,0.7)",
              "inset 0 0 30px rgba(0,0,0,0.15)",
              "0 0 0 1px rgba(255,215,0,0.15)",
            ].join(", "),
          }}
        >
          {/* ── Cell grid (overflow hidden for rounded corner clipping) ── */}
          <div
            data-ocid="game.board"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, 1fr)",
              gridTemplateRows: "repeat(15, 1fr)",
              width: "100%",
              height: "100%",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 225 }, (_, idx) => {
              const row = Math.floor(idx / 15);
              const col = idx % 15;
              const type = getCellType(row, col);
              const tokensHere = cellTokens(row, col);
              const isSafe = type === "safe";
              const isCenterStar = type === "center-star";
              const isCenter = type === "center" || isCenterStar;
              const cellStyle = getCellStyle(type);

              return (
                <div
                  key={`cell-${row}-${col}`}
                  className="relative flex items-center justify-center select-none"
                  style={{
                    ...cellStyle,
                    minWidth: 0,
                    minHeight: 0,
                    border: "0.5px solid rgba(0,0,0,0.1)",
                  }}
                  data-ocid={`game.cell.${row}.${col}`}
                >
                  {/* Center cell: royal frame + branding */}
                  {isCenterStar && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "clamp(52px, 10vw, 90px)",
                          height: "clamp(52px, 10vw, 90px)",
                          borderRadius: "50%",
                          background:
                            "radial-gradient(circle at 35% 30%, #2d6a4f, #064e35 65%, #022c1a)",
                          border: "4px solid #FFD700",
                          boxShadow:
                            "0 0 0 2px #FFA500, 0 0 0 4px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          animation: "ludoGoldShimmer 2s ease-in-out infinite",
                        }}
                      >
                        <span style={{ fontSize: "clamp(18px, 3.5vw, 32px)" }}>
                          👤
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "clamp(4px, 1vw, 8px)",
                          fontWeight: 900,
                          marginTop: 2,
                          lineHeight: 1.2,
                          background:
                            "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          filter: "drop-shadow(0 0 3px rgba(255,215,0,0.7))",
                          letterSpacing: "1px",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Digital
                        <br />
                        Zindagi
                      </p>
                    </div>
                  )}
                  {/* Safe star */}
                  {isSafe && tokensHere.length === 0 && (
                    <span
                      style={{
                        fontSize: "clamp(7px, 1.6vw, 11px)",
                        color: "#FFD700",
                        textShadow: "0 0 4px rgba(255,215,0,0.8)",
                      }}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  )}
                  {/* Tokens */}
                  {!isCenter && tokensHere.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        padding: 1,
                      }}
                    >
                      {tokensHere.slice(0, 4).map(({ color, tokenIdx }) => {
                        const movable = isMovableToken(color, tokenIdx);
                        const tokenKey = `${color}-${tokenIdx}`;
                        const isJumping = jumpingToken === tokenKey;
                        const isLanding = landedToken === tokenKey;
                        return (
                          <button
                            key={tokenKey}
                            type="button"
                            aria-label={`${color} token ${tokenIdx + 1}`}
                            onClick={() => movable && moveToken(tokenIdx)}
                            data-ocid={`game.token.${color}.${tokenIdx}`}
                            style={{
                              width: "44%",
                              height: "44%",
                              minWidth: 4,
                              minHeight: 4,
                              background: TOKEN_GRADIENTS[color],
                              borderRadius: "50%",
                              border: movable
                                ? "1.5px solid rgba(255,255,255,0.95)"
                                : "1px solid rgba(0,0,0,0.25)",
                              boxShadow: movable
                                ? "0 6px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.7)"
                                : "0 6px 16px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)",
                              cursor: movable ? "pointer" : "default",
                              position: "relative",
                              overflow: "hidden",
                              animation: isJumping
                                ? "ludoTokenArcJump 0.5s ease-in-out"
                                : isLanding
                                  ? "ludoLandBounce 0.4s ease-out"
                                  : movable
                                    ? "ludoTokenPulse 1.2s ease-in-out infinite"
                                    : "none",
                              zIndex: movable ? 10 : 1,
                              willChange: isJumping ? "transform" : "auto",
                            }}
                          >
                            {/* 3D sphere highlight */}
                            <span
                              style={{
                                position: "absolute",
                                top: "8%",
                                left: "8%",
                                width: "36%",
                                height: "28%",
                                borderRadius: "50%",
                                background:
                                  "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 70%)",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Bottom shadow ellipse */}
                            <span
                              style={{
                                position: "absolute",
                                bottom: "2%",
                                left: "15%",
                                width: "70%",
                                height: "20%",
                                borderRadius: "50%",
                                background: "rgba(0,0,0,0.25)",
                                filter: "blur(1px)",
                                pointerEvents: "none",
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* end inner grid */}

          {/* ── Absolute Dice Overlay — moves to active player's corner ── */}
          <div
            data-ocid="game.dice_overlay"
            style={{
              position: "absolute",
              ...activeDiceCorner,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "8px 10px",
              borderRadius: 16,
              background: "rgba(5,5,15,0.88)",
              backdropFilter: "blur(8px)",
              border: `1.5px solid ${activeHex}55`,
              transition:
                "top 0.5s cubic-bezier(0.34,1.56,0.64,1), right 0.5s cubic-bezier(0.34,1.56,0.64,1), bottom 0.5s cubic-bezier(0.34,1.56,0.64,1), left 0.5s cubic-bezier(0.34,1.56,0.64,1), border-color 0.4s ease",
              animation: activePulse,
              minWidth: 82,
            }}
          >
            {currentPlayer && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: activeHex,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  textShadow: `0 0 6px ${activeHex}99`,
                  whiteSpace: "nowrap",
                }}
              >
                {currentPlayer.name.slice(0, 8)}'s Turn
              </span>
            )}
            <DiceFace value={diceValue} rolling={rolling} />
            <button
              type="button"
              onClick={rollDice}
              disabled={!canRoll}
              data-ocid="game.roll_btn"
              style={{
                padding: "8px 14px",
                borderRadius: "50px",
                fontWeight: 900,
                fontSize: "12px",
                letterSpacing: "0.5px",
                border: canRoll ? `1.5px solid ${activeHex}88` : "none",
                cursor: canRoll ? "pointer" : "not-allowed",
                color: canRoll ? "#fff" : "rgba(255,255,255,0.4)",
                background: canRoll
                  ? `linear-gradient(135deg, ${activeHex}dd 0%, ${activeHex} 100%)`
                  : "rgba(60,60,70,0.7)",
                boxShadow: canRoll
                  ? `0 4px 14px ${activeHex}66, inset 0 1px 0 rgba(255,255,255,0.2)`
                  : "none",
                animation: canRoll
                  ? "ludoRollPulse 1.8s ease-in-out infinite"
                  : "none",
                transition: "background 0.25s, border-color 0.4s",
                opacity: canRoll ? 1 : 0.5,
                whiteSpace: "nowrap",
              }}
              onMouseDown={(e) => {
                if (canRoll)
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(1px) scale(0.97)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
              onTouchStart={(e) => {
                if (canRoll)
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(1px) scale(0.97)";
              }}
              onTouchEnd={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
            >
              {rolling ? "⏳…" : diceRolled ? `${diceValue} ✅` : "🎲 Roll"}
            </button>
          </div>
        </div>
        {/* end board_wrapper */}
      </div>

      {/* ── Fixed AdMob Banner (absolute bottom, never overlaps board) ── */}
      <div
        data-ocid="game.banner_ad"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          height: 60,
          background: "rgba(0,0,0,0.92)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 320,
            height: 50,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.18)",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
          >
            {bannerUnitId
              ? `Ad: ${bannerUnitId.slice(0, 22)}…`
              : "Advertisement — Digital Zindagi"}
          </span>
        </div>
      </div>
    </div>
  );
}
