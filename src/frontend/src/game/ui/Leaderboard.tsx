/**
 * Leaderboard — top scores modal (replaces old Leaderboard.tsx)
 */
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type LeaderboardEntry,
  addScore,
  getCurrentWeekRange,
  getLeaderboard,
  rankMedal,
} from "../utils/leaderboard";

interface Props {
  onClose: () => void;
  latestEntry?: LeaderboardEntry | null;
}

export default function Leaderboard({ onClose, latestEntry }: Props) {
  const entries = getLeaderboard();
  const { start, end } = getCurrentWeekRange();
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmitName = useCallback(() => {
    if (!playerName.trim() || !latestEntry) return;
    addScore(
      latestEntry.score,
      latestEntry.wave,
      latestEntry.level ?? 1,
      playerName.trim(),
    );
    setSubmitted(true);
  }, [playerName, latestEntry]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      data-ocid="leaderboard-modal"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="rounded-2xl p-5 max-w-sm w-full mx-4 flex flex-col"
        style={{
          background: "#080604",
          border: "2px solid rgba(240,192,64,0.5)",
          maxHeight: "85vh",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black" style={{ color: "#f0c040" }}>
              🏆 Leaderboard
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>
              {start} – {end}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10"
            style={{ color: "#f0c040" }}
            aria-label="Close"
            data-ocid="leaderboard-close"
          >
            <X size={20} />
          </button>
        </div>

        {latestEntry && !submitted && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{
              background: "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.3)",
            }}
          >
            <div
              className="text-sm font-bold mb-2"
              style={{ color: "#00ff88" }}
            >
              🎉 Score: {latestEntry.score.toLocaleString()} — Naam daalo!
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitName()}
                placeholder="Aapka naam..."
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  color: "#fff",
                }}
                data-ocid="leaderboard-name-input"
              />
              <button
                type="button"
                onClick={handleSubmitName}
                className="px-4 py-2 rounded-lg font-bold text-sm"
                style={{ background: "#00ff88", color: "#020503" }}
                data-ocid="leaderboard-submit-btn"
              >
                ✓
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {entries.length === 0 ? (
            <div className="text-center py-8" style={{ color: "#666" }}>
              <div className="text-4xl mb-2">🎮</div>
              <div className="text-sm">
                Abhi koi score nahi hai. Khelo aur pehla score banao!
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => {
                const isLatest = latestEntry?.id === e.id;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: isLatest
                        ? "rgba(0,255,136,0.12)"
                        : i < 3
                          ? "rgba(240,192,64,0.07)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isLatest ? "rgba(0,255,136,0.4)" : i < 3 ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)"}`,
                    }}
                    data-ocid={`leaderboard-row-${i}`}
                  >
                    <div
                      className="text-lg font-bold w-8 text-center"
                      style={{ color: i < 3 ? "#f0c040" : "#666" }}
                    >
                      {rankMedal(i + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm truncate"
                        style={{ color: isLatest ? "#00ff88" : "#ddd" }}
                      >
                        {e.playerName}
                        {isLatest && (
                          <span className="ml-1 text-xs opacity-60">(You)</span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: "#888" }}>
                        Wave {e.wave} · Level {e.level ?? 1}
                      </div>
                    </div>
                    <div
                      className="font-black tabular-nums"
                      style={{ color: i === 0 ? "#f0c040" : "#aaa" }}
                    >
                      {e.score.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl font-bold text-sm"
          style={{
            background: "rgba(240,192,64,0.12)",
            border: "1px solid rgba(240,192,64,0.3)",
            color: "#f0c040",
          }}
          data-ocid="leaderboard-done-btn"
        >
          Wapas Jao ↩
        </button>
      </motion.div>
    </motion.div>
  );
}
