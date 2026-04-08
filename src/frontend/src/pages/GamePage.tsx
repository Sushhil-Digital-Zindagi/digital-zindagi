import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas } from "../game/GameCanvas";
import { getHighScore, useGameStore } from "../game/stores/gameStore";
import Leaderboard from "../game/ui/Leaderboard";
import WeaponSelect from "../game/ui/WeaponSelect";
import { GameAudio, SFX, resumeAudio } from "../game/utils/audioEngine";
import {
  type LeaderboardEntry,
  addScore as addLeaderboardScore,
  isHighScore,
} from "../game/utils/leaderboard";
import { useNavigate } from "../lib/router";

// ─── Orientation Guard ─────────────────────────────────────────────────────────

function OrientationGuard({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(
    () => window.innerWidth > window.innerHeight,
  );

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!isLandscape) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-50"
        style={{ background: "#050d08" }}
        data-ocid="orientation-guard"
      >
        <div className="text-6xl mb-4 animate-bounce">📱</div>
        <div
          className="text-2xl font-black text-center mb-2"
          style={{ color: "#00ff88" }}
        >
          Please rotate your device
        </div>
        <div
          className="text-lg text-center opacity-75"
          style={{ color: "#00cc66" }}
        >
          कृपया फोन घुमाएं
        </div>
        <div className="text-4xl mt-4 opacity-60">🔄</div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── WhatsApp Share ────────────────────────────────────────────────────────────

function shareOnWhatsApp(score: number, wave: number) {
  const text = encodeURIComponent(
    `🎮 Maine Digital Zindagi Alien Shooter mein ${score.toLocaleString()} score kiya! Wave ${wave} tak pahuncha!\n\nTum bhi khelo! Digital Zindagi — apna score beat karo! 💪`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

// ─── HUD ───────────────────────────────────────────────────────────────────────

function GameHUD() {
  const { score, waveCount, coins, heroHP, heroMaxHP } = useGameStore();
  const hpFrac = Math.max(0, heroHP / heroMaxHP);
  const hpColor =
    hpFrac > 0.6 ? "#22dd55" : hpFrac > 0.3 ? "#ffaa00" : "#ff3300";

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-3 pt-2 pointer-events-none"
      data-ocid="game-hud"
    >
      {/* HP Bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">❤️</span>
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: 110,
              height: 10,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-200"
              style={{ width: `${hpFrac * 100}%`, background: hpColor }}
            />
          </div>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: hpColor, textShadow: "0 0 6px currentColor" }}
          >
            {heroHP}
          </span>
        </div>
      </div>

      {/* Wave */}
      <div
        className="flex flex-col items-center px-3 py-1 rounded-xl"
        style={{
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(0,255,136,0.25)",
        }}
      >
        <span className="text-xs font-bold" style={{ color: "#00ff88" }}>
          WAVE {waveCount}/12
        </span>
      </div>

      {/* Score + Coins */}
      <div
        className="flex flex-col items-end gap-0.5 px-3 py-1 rounded-xl"
        style={{
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,200,0,0.2)",
        }}
      >
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: "#f0c040" }}
        >
          {score.toLocaleString()}
        </span>
        <span className="text-xs" style={{ color: "#00ee77" }}>
          🪙 {coins}
        </span>
      </div>
    </div>
  );
}

// ─── Wave Announcement ─────────────────────────────────────────────────────────

function WaveAnnouncement() {
  const { waveCount, gamePhase } = useGameStore();
  const [visible, setVisible] = useState(false);
  const prevWave = useRef(waveCount);

  useEffect(() => {
    if (gamePhase !== "playing") return;
    if (waveCount !== prevWave.current) {
      prevWave.current = waveCount;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [waveCount, gamePhase]);

  // Show on game start
  useEffect(() => {
    if (gamePhase === "playing") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [gamePhase]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div
            className="px-8 py-4 rounded-2xl text-center"
            style={{
              background: "rgba(0,10,5,0.85)",
              border: "2px solid rgba(0,255,136,0.5)",
              boxShadow: "0 0 32px rgba(0,255,136,0.3)",
            }}
          >
            <div
              className="text-3xl font-black"
              style={{
                color: "#00ff88",
                textShadow: "0 0 16px #00ff88",
              }}
            >
              ⚔️ WAVE {waveCount}
            </div>
            <div className="text-sm mt-1" style={{ color: "#aaa" }}>
              {waveCount === 1
                ? "Game shuru! — Alien hords se ladho!"
                : waveCount >= 12
                  ? "FINAL WAVE! 🔥"
                  : `Wave ${waveCount} — Aur bhi khatarnak!`}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Virtual Joystick ─────────────────────────────────────────────────────────

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

function VirtualJoystick({ onMove, onEnd }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const basePos = useRef({ x: 0, y: 0 });
  const RADIUS = 42;

  const handleStart = useCallback((e: React.TouchEvent) => {
    if (touchId.current !== null) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    const rect = baseRef.current?.getBoundingClientRect();
    if (rect) {
      basePos.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, []);

  const handleMove = useCallback(
    (e: React.TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== touchId.current) continue;
        const dx = t.clientX - basePos.current.x;
        const dy = t.clientY - basePos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedX = dist > RADIUS ? (dx / dist) * RADIUS : dx;
        const clampedY = dist > RADIUS ? (dy / dist) * RADIUS : dy;
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(${clampedX}px,${clampedY}px)`;
        }
        const nx = clampedX / RADIUS;
        const ny = clampedY / RADIUS;
        onMove(nx, ny);
      }
    },
    [onMove],
  );

  const handleEnd = useCallback(
    (e: React.TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== touchId.current) continue;
        touchId.current = null;
        if (stickRef.current)
          stickRef.current.style.transform = "translate(0px,0px)";
        onEnd();
      }
    },
    [onEnd],
  );

  return (
    <div
      className="absolute bottom-8 left-8 z-10"
      style={{ touchAction: "none" }}
      data-ocid="game-joystick"
    >
      <div
        ref={baseRef}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 100,
          height: 100,
          background: "rgba(0,255,136,0.08)",
          border: "2px solid rgba(0,255,136,0.3)",
        }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        <div
          ref={stickRef}
          className="rounded-full transition-none"
          style={{
            width: 44,
            height: 44,
            background: "rgba(0,255,136,0.55)",
            border: "2px solid rgba(0,255,136,0.8)",
            boxShadow: "0 0 12px rgba(0,255,136,0.4)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Attack Button ─────────────────────────────────────────────────────────────

function AttackButton({ onAttack }: { onAttack: () => void }) {
  return (
    <button
      type="button"
      className="absolute bottom-8 right-8 z-10 rounded-full font-black text-2xl flex items-center justify-center active:scale-90 transition-transform select-none"
      style={{
        width: 80,
        height: 80,
        background: "rgba(255,40,40,0.85)",
        border: "3px solid rgba(255,100,100,0.8)",
        boxShadow: "0 0 20px rgba(255,50,50,0.5)",
        color: "#fff",
        touchAction: "none",
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onAttack();
      }}
      onClick={onAttack}
      data-ocid="game-attack-btn"
      aria-label="Attack"
    >
      🔥
    </button>
  );
}

// ─── Main GamePage ─────────────────────────────────────────────────────────────

export default function GamePage() {
  const {
    score,
    waveCount,
    coins,
    heroHP,
    gamePhase,
    currentWeapon,
    resetGame,
    setWeapon,
    setSpawnInvincible,
    volume,
    leaderboardVisible,
    setLeaderboardVisible,
  } = useGameStore();

  const navigate = useNavigate();
  const keys = useRef<Set<string>>(new Set());
  const joystick = useRef({ x: 0, y: 0 });
  const latestEntryRef = useRef<LeaderboardEntry | null>(null);
  const gameOverHandled = useRef(false);
  const audioStarted = useRef(false);

  // Keyboard handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Prevent scroll during game
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = prev;
    };
  }, []);

  // Leaderboard on game over
  useEffect(() => {
    if (gamePhase === "gameover" && !gameOverHandled.current && score > 0) {
      gameOverHandled.current = true;
      const entry = addLeaderboardScore(score, waveCount);
      latestEntryRef.current = entry;
      SFX.gameOver(volume);
      GameAudio.stopTheme();
      audioStarted.current = false;
      if (isHighScore(score)) {
        setTimeout(() => setLeaderboardVisible(true), 1200);
      }
    }
    if (gamePhase === "playing") {
      gameOverHandled.current = false;
      latestEntryRef.current = null;
    }
  }, [gamePhase, score, waveCount, setLeaderboardVisible, volume]);

  useEffect(() => {
    return () => {
      GameAudio.stopTheme();
      audioStarted.current = false;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    resumeAudio();
    if (!audioStarted.current) {
      audioStarted.current = true;
      setTimeout(() => {
        GameAudio.playTheme();
        GameAudio.setMasterVolume(volume);
      }, 300);
    }
    resetGame();
    setTimeout(() => setSpawnInvincible(false), 2000);
  }, [resetGame, setSpawnInvincible, volume]);

  const handleRestart = useCallback(() => {
    resumeAudio();
    resetGame();
    if (!audioStarted.current) {
      audioStarted.current = true;
      setTimeout(() => {
        GameAudio.playTheme();
        GameAudio.setMasterVolume(volume);
      }, 300);
    }
    setTimeout(() => setSpawnInvincible(false), 2000);
  }, [resetGame, setSpawnInvincible, volume]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    joystick.current = { x, y };
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystick.current = { x: 0, y: 0 };
  }, []);

  const handleAttack = useCallback(() => {
    keys.current.add("Space");
    setTimeout(() => keys.current.delete("Space"), 150);
  }, []);

  const handleGoHome = useCallback(() => {
    GameAudio.stopTheme();
    audioStarted.current = false;
    navigate("/");
  }, [navigate]);

  return (
    <OrientationGuard>
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: "#030a05", touchAction: "none" }}
        data-ocid="game-page"
      >
        {/* Three.js canvas — always mounted */}
        <div className="absolute inset-0">
          <GameCanvas keys={keys} joystick={joystick} />
        </div>

        {/* START SCREEN */}
        <AnimatePresence>
          {gamePhase === "start" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto"
              style={{ background: "rgba(3,10,5,0.92)" }}
            >
              <div className="relative z-10 flex flex-col items-center gap-4 px-5 py-6 max-w-sm w-full mx-auto">
                {/* Back */}
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="self-start flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: "#00ff88" }}
                  data-ocid="game-back-btn"
                >
                  <ArrowLeft size={16} />
                  Wapas Jao
                </button>

                {/* Title */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div
                    className="text-4xl font-black tracking-widest mb-1"
                    style={{
                      color: "#00ff88",
                      textShadow: "0 0 24px #00ff88, 0 0 48px #00aa55",
                    }}
                  >
                    👾 ALIEN SHOOTER
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{ color: "#00cc66" }}
                  >
                    Digital Zindagi
                  </div>
                  <div
                    className="text-sm mt-1 opacity-60"
                    style={{ color: "#aaa" }}
                  >
                    लड़ो • जीतो • आगे बढ़ो
                  </div>
                </motion.div>

                {/* Best Score + Leaderboard */}
                <div className="flex gap-3 w-full">
                  <div
                    className="rounded-xl px-5 py-2.5 text-center flex-1"
                    style={{
                      background: "rgba(0,255,136,0.08)",
                      border: "1px solid rgba(0,255,136,0.25)",
                      color: "#00ff88",
                    }}
                  >
                    <div className="text-xs opacity-60">🏆 Best Score</div>
                    <div className="text-2xl font-bold">
                      {getHighScore().toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeaderboardVisible(true)}
                    className="rounded-xl px-4 py-2.5 flex flex-col items-center justify-center gap-1 transition-opacity hover:opacity-80"
                    style={{
                      background: "rgba(0,255,136,0.08)",
                      border: "1px solid rgba(0,255,136,0.25)",
                      color: "#00ff88",
                    }}
                    data-ocid="leaderboard-btn"
                  >
                    <Trophy size={18} />
                    <span className="text-xs opacity-70">Top 10</span>
                  </button>
                </div>

                {/* Weapon select */}
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <WeaponSelect selected={currentWeapon} onSelect={setWeapon} />
                </motion.div>

                {/* START button */}
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", bounce: 0.3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleStartGame}
                  className="w-full rounded-2xl font-black flex items-center justify-center gap-3"
                  style={{
                    background:
                      "linear-gradient(135deg, #003318 0%, #005a2a 50%, #003318 100%)",
                    border: "2px solid #00ff88",
                    color: "#00ff88",
                    fontSize: "20px",
                    minHeight: "60px",
                    boxShadow: "0 0 24px rgba(0,255,136,0.35)",
                    textShadow: "0 0 8px #00ff88",
                  }}
                  data-ocid="start-game-btn"
                >
                  <span>▶</span>
                  <span>
                    Start Game
                    <br />
                    <span style={{ fontSize: "15px", opacity: 0.85 }}>
                      गेम शुरू करें
                    </span>
                  </span>
                </motion.button>

                <div
                  className="text-xs text-center opacity-40"
                  style={{ color: "#bbb" }}
                >
                  <span className="hidden md:inline">
                    WASD = Move • Space/Auto = Attack
                  </span>
                  <span className="md:hidden">
                    Joystick = Move • Red = Attack
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME OVER */}
        <AnimatePresence>
          {gamePhase === "gameover" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-20"
              style={{ background: "rgba(0,0,0,0.92)" }}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4"
                style={{
                  background: "rgba(5,15,8,0.97)",
                  border: "2px solid rgba(255,50,0,0.4)",
                }}
              >
                <div className="text-6xl">💀</div>
                <div
                  className="text-2xl font-black"
                  style={{ color: "#ff3300" }}
                >
                  GAME OVER
                </div>

                {isHighScore(score) && score > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-center"
                    style={{
                      background: "rgba(0,255,136,0.15)",
                      border: "1px solid rgba(0,255,136,0.4)",
                      color: "#00ff88",
                    }}
                  >
                    🏆 New High Score!
                  </motion.div>
                )}

                <div className="text-center">
                  <div className="text-xs opacity-60" style={{ color: "#aaa" }}>
                    Score
                  </div>
                  <div
                    className="text-4xl font-bold"
                    style={{ color: "#00ff88" }}
                  >
                    {score.toLocaleString()}
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "#aaa" }}
                >
                  <span>🪙 {coins}</span>
                  <span>•</span>
                  <span>Wave {waveCount}</span>
                  <span>•</span>
                  <span>❤️ {heroHP} HP</span>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{
                      background: "rgba(0,255,136,0.15)",
                      border: "2px solid #00ff88",
                      color: "#00ff88",
                    }}
                    data-ocid="restart-game-btn"
                  >
                    <RotateCcw size={16} /> Dobara Khelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardVisible(true)}
                    className="py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{
                      background: "rgba(0,255,136,0.08)",
                      border: "1px solid rgba(0,255,136,0.3)",
                      color: "#00ff88",
                    }}
                    data-ocid="gameover-leaderboard-btn"
                  >
                    <Trophy size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => shareOnWhatsApp(score, waveCount)}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                  style={{ background: "#25d366", color: "#fff" }}
                  data-ocid="gameover-whatsapp-btn"
                >
                  📲 WhatsApp Share
                </button>

                <button
                  type="button"
                  onClick={handleGoHome}
                  className="text-sm opacity-50 hover:opacity-80 transition-opacity"
                  style={{ color: "#aaa" }}
                  data-ocid="gameover-home-btn"
                >
                  🏠 Home par Jao
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WIN SCREEN */}
        <AnimatePresence>
          {gamePhase === "playing" && waveCount > 12 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-20"
              style={{ background: "rgba(0,20,10,0.95)" }}
            >
              <div className="text-7xl mb-4">🏆</div>
              <div
                className="text-3xl font-black mb-2"
                style={{ color: "#00ff88", textShadow: "0 0 20px #00ff88" }}
              >
                YOU WIN!
              </div>
              <div className="text-lg mb-4" style={{ color: "#aaa" }}>
                Sabhi 12 waves complete!
              </div>
              <div
                className="text-3xl font-bold mb-6"
                style={{ color: "#f0c040" }}
              >
                {score.toLocaleString()} pts
              </div>
              <button
                type="button"
                onClick={() => shareOnWhatsApp(score, waveCount)}
                className="px-8 py-3 rounded-xl font-bold text-lg mb-3"
                style={{ background: "#25d366", color: "#fff" }}
              >
                📲 Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={handleGoHome}
                className="text-sm opacity-60 hover:opacity-90 transition-opacity"
                style={{ color: "#00ff88" }}
              >
                🏠 Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD (visible while playing) */}
        {gamePhase === "playing" && (
          <>
            <GameHUD />
            <WaveAnnouncement />
            <VirtualJoystick
              onMove={handleJoystickMove}
              onEnd={handleJoystickEnd}
            />
            <AttackButton onAttack={handleAttack} />
            {/* Exit button */}
            <button
              type="button"
              onClick={handleGoHome}
              className="absolute top-2 right-14 z-10 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-100 opacity-50"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
              }}
              data-ocid="game-exit-btn"
            >
              ✕ Exit
            </button>
          </>
        )}

        {/* Leaderboard modal */}
        <AnimatePresence>
          {leaderboardVisible && (
            <Leaderboard
              onClose={() => setLeaderboardVisible(false)}
              latestEntry={latestEntryRef.current}
            />
          )}
        </AnimatePresence>
      </div>
    </OrientationGuard>
  );
}
