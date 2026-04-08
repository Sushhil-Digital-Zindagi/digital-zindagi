import { ArrowLeft, Play, RotateCcw, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { GameCanvas } from "../game/GameCanvas";
import { getHighScore, useGameStore } from "../game/stores/gameStore";
import AttackButton from "../game/ui/AttackButton";
import GameHUD from "../game/ui/GameHUD";
import Leaderboard from "../game/ui/Leaderboard";
import PhotoUpload from "../game/ui/PhotoUpload";
import VirtualJoystick from "../game/ui/VirtualJoystick";
import WeaponSelect from "../game/ui/WeaponSelect";
import { GameAudio, SFX, resumeAudio } from "../game/utils/audioEngine";
import {
  type LeaderboardEntry,
  addScore as addLeaderboardScore,
  isHighScore,
} from "../game/utils/leaderboard";
import { Link, useNavigate } from "../lib/router";

// ─── WhatsApp Share helper ────────────────────────────────────────────────────

function shareOnWhatsApp(score: number, wave: number) {
  const text = encodeURIComponent(
    `🔥 Maine Digital Zindagi: Real Human mein ${score.toLocaleString()} score kiya! Wave ${wave} tak pahuncha!\n\n🎮 Tum bhi khelo: ${window.location.href}\n\nDigital Zindagi — Apna score beat karo! 💪`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
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
    restartFromCheckpoint,
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
  // Guard: ensure audio only starts on explicit user gesture
  const audioStarted = useRef(false);

  // ── Keyboard handlers — with proper cleanup
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

  // ── Prevent body scroll during game (mobile rubber-band fix)
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = prev;
    };
  }, []);

  // ── Add to leaderboard on game over
  useEffect(() => {
    if (gamePhase === "gameover" && !gameOverHandled.current && score > 0) {
      gameOverHandled.current = true;
      const entry = addLeaderboardScore(score, waveCount);
      latestEntryRef.current = entry;
      SFX.gameOver(volume);
      // Stop theme music on game over
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

  // ── Cleanup audio on unmount
  useEffect(() => {
    return () => {
      GameAudio.stopTheme();
      audioStarted.current = false;
    };
  }, []);

  // ── Start game — audio triggered only here (user gesture)
  const handleStartGame = useCallback(() => {
    // Resume / create audio context from user gesture
    resumeAudio();

    // FIX 4: Start theme on first click — once pattern
    if (!audioStarted.current) {
      audioStarted.current = true;
      // Small delay so context is running before we start
      setTimeout(() => {
        GameAudio.playTheme();
        GameAudio.setMasterVolume(volume);
      }, 300);
    }

    resetGame();

    // FIX 2: Spawn invincibility — clear after 2 seconds
    setTimeout(() => {
      setSpawnInvincible(false);
    }, 2000);
  }, [resetGame, setSpawnInvincible, volume]);

  const handleRestart = useCallback(() => {
    resumeAudio();

    // FIX 3: Restart from checkpoint, not from scratch
    restartFromCheckpoint();

    // Restart theme if not running
    if (!audioStarted.current) {
      audioStarted.current = true;
      setTimeout(() => {
        GameAudio.playTheme();
        GameAudio.setMasterVolume(volume);
      }, 300);
    }

    // FIX 2: Spawn invincibility — clear after 2 seconds
    setTimeout(() => {
      setSpawnInvincible(false);
    }, 2000);
  }, [restartFromCheckpoint, setSpawnInvincible, volume]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    joystick.current = { x, y };
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystick.current = { x: 0, y: 0 };
  }, []);

  const handleAttack = useCallback(() => {
    keys.current.add("Space");
    setTimeout(() => keys.current.delete("Space"), 200);
  }, []);

  const handleGoHome = useCallback(() => {
    GameAudio.stopTheme();
    audioStarted.current = false;
    navigate("/");
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: "#020503",
        touchAction: "none",
        willChange: "transform",
      }}
      data-ocid="game-page"
    >
      {/* 3D Canvas layer — ALWAYS rendered, never unmounted */}
      <div className="absolute inset-0" style={{ willChange: "transform" }}>
        <GameCanvas keys={keys} joystick={joystick} />
      </div>

      {/* ── START SCREEN ── */}
      <AnimatePresence>
        {gamePhase === "start" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="absolute inset-0 z-20 overflow-y-auto"
            style={{
              background:
                "linear-gradient(135deg, #0a0a0a 0%, #1a0500 40%, #050a08 80%, #0a0a1a 100%)",
            }}
          >
            {/* Cinematic overlay grid texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 30%, rgba(0,255,136,0.07) 0%, transparent 60%)",
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-4 px-5 py-6 min-h-full max-w-sm mx-auto">
              {/* Back to home */}
              <button
                type="button"
                onClick={handleGoHome}
                className="self-start flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "#f0c040" }}
                data-ocid="game-back-btn"
              >
                <ArrowLeft size={16} />
                Home par Jao
              </button>

              {/* Flaming title */}
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
                    textShadow:
                      "0 0 24px #00ff88, 0 0 48px #00aa55, 0 0 6px #ff6600",
                  }}
                >
                  🔥 REAL HUMAN 🔥
                </div>
                <div
                  className="text-base font-semibold"
                  style={{ color: "#f0c040", textShadow: "0 0 10px #f0c040" }}
                >
                  Digital Zindagi
                </div>
                <div
                  className="text-sm mt-1 opacity-60"
                  style={{ color: "#ccc" }}
                >
                  लड़ो • जीतो • आगे बढ़ो
                </div>
              </motion.div>

              {/* High Score + Leaderboard trigger */}
              <div className="flex gap-3 w-full">
                <div
                  className="game-hud-bg rounded-xl px-5 py-2.5 text-center flex-1"
                  style={{ color: "#f0c040" }}
                >
                  <div className="text-xs opacity-60">🏆 Best Score</div>
                  <div className="text-2xl font-bold">
                    {getHighScore().toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaderboardVisible(true)}
                  className="game-hud-bg rounded-xl px-4 py-2.5 flex flex-col items-center justify-center gap-1 transition-opacity hover:opacity-80"
                  style={{
                    color: "#f0c040",
                    border: "1px solid rgba(240,192,64,0.25)",
                  }}
                  data-ocid="leaderboard-btn"
                >
                  <Trophy size={18} />
                  <span className="text-xs opacity-70">Board</span>
                </button>
              </div>

              {/* Photo upload */}
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <PhotoUpload />
              </motion.div>

              {/* Weapon selection */}
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <WeaponSelect selected={currentWeapon} onSelect={setWeapon} />
              </motion.div>

              {/* ── BIG START BUTTON ── */}
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", bounce: 0.3 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStartGame}
                className="w-full rounded-2xl font-black flex items-center justify-center gap-3"
                style={{
                  background:
                    "linear-gradient(135deg, #064420 0%, #0a6632 50%, #064420 100%)",
                  border: "2px solid #f0c040",
                  color: "#ffffff",
                  fontSize: "22px",
                  minHeight: "60px",
                  boxShadow:
                    "0 0 24px rgba(0,255,136,0.3), 0 4px 16px rgba(0,0,0,0.6)",
                  letterSpacing: "0.5px",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                }}
                data-ocid="start-game-btn"
              >
                <Play size={24} fill="currentColor" />
                <span>
                  🔥 Start Game
                  <br />
                  <span style={{ fontSize: "16px", opacity: 0.9 }}>
                    गेम शुरू करें
                  </span>
                </span>
              </motion.button>

              <div
                className="text-xs text-center opacity-40"
                style={{ color: "#bbb" }}
              >
                <span className="hidden md:inline">
                  WASD = Move • Space = Attack
                </span>
                <span className="md:hidden">
                  Joystick = Chalo • Red Button = Attack
                </span>
              </div>

              {/* Spacer for safe-area on notched phones */}
              <div className="h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GAME OVER SCREEN ── */}
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
              className="game-hud-bg rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4"
              style={{ border: "2px solid rgba(255,50,0,0.4)" }}
            >
              <div className="text-6xl">💀</div>
              <div className="text-2xl font-black" style={{ color: "#ff3300" }}>
                GAME OVER
              </div>

              {isHighScore(score) && score > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-center"
                  style={{
                    background: "rgba(240,192,64,0.2)",
                    border: "1px solid rgba(240,192,64,0.4)",
                    color: "#f0c040",
                  }}
                >
                  🏆 Leaderboard mein entry ho gayi!
                </motion.div>
              )}

              {/* Score display */}
              <div className="text-center">
                <div className="text-xs opacity-60" style={{ color: "#aaa" }}>
                  Aapka Score
                </div>
                <div
                  className="text-4xl font-bold"
                  style={{ color: "#f0c040" }}
                >
                  {score.toLocaleString()}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs opacity-60" style={{ color: "#aaa" }}>
                  🏆 Best Score
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#00ff88" }}
                >
                  {getHighScore().toLocaleString()}
                </div>
              </div>

              <div
                className="flex items-center gap-3 text-sm"
                style={{ color: "#f0c040" }}
              >
                <span>🪙 {coins} Coins</span>
                <span>•</span>
                <span>Wave {waveCount}</span>
                <span>•</span>
                <span>❤️ {heroHP} HP</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="game-cta-gold flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
                  data-ocid="restart-game-btn"
                >
                  <RotateCcw size={18} />🔄 Dobara Khelo
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardVisible(true)}
                  className="game-hud-bg py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{
                    color: "#f0c040",
                    border: "1px solid rgba(240,192,64,0.3)",
                  }}
                  data-ocid="gameover-leaderboard-btn"
                >
                  <Trophy size={16} />
                </button>
              </div>

              {/* WhatsApp Share */}
              <button
                type="button"
                onClick={() => shareOnWhatsApp(score, waveCount)}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{
                  background: "#25d366",
                  color: "#fff",
                }}
                data-ocid="gameover-whatsapp-btn"
              >
                📲 WhatsApp Par Share Karo
              </button>

              {/* Home button */}
              <button
                type="button"
                onClick={handleGoHome}
                className="text-sm opacity-50 hover:opacity-80 transition-opacity"
                style={{ color: "#aaa" }}
                data-ocid="gameover-home-btn"
              >
                🏠 Wapas Jao (Home)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLAYING HUD OVERLAY ── */}
      <GameHUD />

      {/* ── TOUCH CONTROLS (only when playing) ── */}
      {gamePhase === "playing" && (
        <>
          <VirtualJoystick
            onMove={handleJoystickMove}
            onEnd={handleJoystickEnd}
          />
          <AttackButton onAttack={handleAttack} />
        </>
      )}

      {/* ── LEADERBOARD MODAL ── */}
      <AnimatePresence>
        {leaderboardVisible && (
          <Leaderboard
            onClose={() => setLeaderboardVisible(false)}
            latestEntry={latestEntryRef.current}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
