import { Home, Play, RotateCcw, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "../../lib/router";
import { useGameStore } from "../stores/gameStore";
import { setMasterVolume } from "../utils/audioEngine";

const VOLUME_KEY = "dz_game_volume";

export default function PauseMenu() {
  const { setGamePhase, resetGame, setLeaderboardVisible } = useGameStore();
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved ? Number(saved) : 70;
  });

  useEffect(() => {
    setMasterVolume(volume / 100);
  }, [volume]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      setVolume(v);
      localStorage.setItem(VOLUME_KEY, String(v / 100));
      setMasterVolume(v / 100);
    },
    [],
  );

  const handleResume = useCallback(() => {
    setGamePhase("playing");
  }, [setGamePhase]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleLeaderboard = useCallback(() => {
    setLeaderboardVisible(true);
  }, [setLeaderboardVisible]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-20"
      style={{ background: "rgba(0,0,0,0.72)" }}
      data-ocid="pause-menu"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="game-hud-bg rounded-2xl p-6 flex flex-col gap-4 max-w-xs w-full mx-4"
        style={{ border: "2px solid rgba(240,192,64,0.35)" }}
      >
        {/* Title */}
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: "#f0c040" }}>
            ⏸ Ruko
          </div>
          <div className="text-xs opacity-50 mt-0.5" style={{ color: "#aaa" }}>
            Game paused hai
          </div>
        </div>

        {/* Volume slider */}
        <div className="space-y-2" data-ocid="volume-slider-section">
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "#aaa" }}
          >
            <span>🔊 Awaaz (Volume)</span>
            <span className="font-bold" style={{ color: "#f0c040" }}>
              {volume}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f0c040 0%, #f0c040 ${volume}%, rgba(255,255,255,0.15) ${volume}%, rgba(255,255,255,0.15) 100%)`,
              outline: "none",
            }}
            data-ocid="volume-slider"
          />
          <div
            className="flex justify-between text-xs opacity-40"
            style={{ color: "#aaa" }}
          >
            <span>🔇</span>
            <span>🔊</span>
          </div>
        </div>

        {/* Buttons */}
        <button
          type="button"
          onClick={handleResume}
          className="game-cta-gold w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          data-ocid="pause-resume-btn"
        >
          <Play size={18} fill="currentColor" />
          Aage Khelo
        </button>

        <button
          type="button"
          onClick={handleLeaderboard}
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            border: "1px solid rgba(240,192,64,0.35)",
            color: "#f0c040",
            background: "rgba(240,192,64,0.06)",
          }}
          data-ocid="pause-leaderboard-btn"
        >
          <Trophy size={16} />🏆 Leaderboard
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#aaa",
            background: "rgba(255,255,255,0.04)",
          }}
          data-ocid="pause-restart-btn"
        >
          <RotateCcw size={16} />
          Fir Se Shuru
        </button>

        <Link
          to="/"
          className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
          style={{ color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}
          data-ocid="pause-home-btn"
        >
          <Home size={15} />
          Homepage par Jao
        </Link>
      </motion.div>
    </motion.div>
  );
}
