import { X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../stores/gameStore";
import {
  type LeaderboardEntry,
  getCurrentWeekRange,
  getLeaderboard,
  rankMedal,
} from "../utils/leaderboard";

const ROW_BG: Record<number, string> = {
  0: "rgba(240,192,64,0.15)",
  1: "rgba(192,192,192,0.12)",
  2: "rgba(180,100,40,0.15)",
};
const ROW_BORDER: Record<number, string> = {
  0: "rgba(240,192,64,0.4)",
  1: "rgba(192,192,192,0.3)",
  2: "rgba(200,120,40,0.3)",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

interface Props {
  onClose: () => void;
  latestEntry?: LeaderboardEntry | null;
}

export default function Leaderboard({ onClose, latestEntry }: Props) {
  const { score, waveCount } = useGameStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selfieShareMsg, setSelfieShareMsg] = useState<string | null>(null);
  const selfieTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekRange = getCurrentWeekRange();

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selfieTimeoutRef.current) clearTimeout(selfieTimeoutRef.current);
    };
  }, []);

  // ── WhatsApp Score Share ──
  const handleShareScore = useCallback(
    (entry?: LeaderboardEntry) => {
      const shareScore = entry?.score ?? latestEntry?.score ?? score;
      const shareWave = entry?.wave ?? latestEntry?.wave ?? waveCount;
      const message = `🎮 Digital Zindagi mein maine ${shareScore.toLocaleString()} points banaye! Wave ${shareWave} tak pahuncha 🔥 Tum bhi khelo! #DigitalZindagi`;
      const url = window.location.href;
      const fullText = `${message}\n${url}`;

      if (navigator.share) {
        navigator
          .share({
            title: "Digital Zindagi: Real Human",
            text: message,
            url,
          })
          .catch(() => {});
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(fullText)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
    },
    [score, waveCount, latestEntry],
  );

  // ── Hero Selfie Share ──
  const handleShareSelfie = useCallback(() => {
    const heroFaceData = localStorage.getItem("dz_game_hero_face");
    const shareScore = latestEntry?.score ?? score;
    const shareWave = latestEntry?.wave ?? waveCount;
    const shareText = `🎯 Yeh hai mera Digital Zindagi hero! Score: ${shareScore.toLocaleString()} | Wave: ${shareWave} 💪 #DigitalZindagi`;

    if (!heroFaceData) {
      // No selfie — just share score
      handleShareScore();
      return;
    }

    // Try native share with file
    if (navigator.share) {
      // Convert base64 to File
      try {
        const arr = heroFaceData.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
        const file = new File([u8arr], "dz-hero.jpg", { type: mime });

        // Check if files sharing is supported
        if (navigator.canShare?.({ files: [file] })) {
          navigator
            .share({
              title: "Digital Zindagi Hero",
              text: shareText,
              files: [file],
            })
            .catch(() => {
              // Fallback to text-only share
              navigator
                .share({
                  title: "Digital Zindagi Hero",
                  text: shareText,
                  url: window.location.href,
                })
                .catch(() => {});
            });
          return;
        }
      } catch {
        // Fall through to WhatsApp
      }

      // Share text+url
      navigator
        .share({
          title: "Digital Zindagi Hero",
          text: shareText,
          url: window.location.href,
        })
        .catch(() => {});
      return;
    }

    // No native share — show selfie preview with instructions
    setSelfieShareMsg(shareText);
    if (selfieTimeoutRef.current) clearTimeout(selfieTimeoutRef.current);
    selfieTimeoutRef.current = setTimeout(() => setSelfieShareMsg(null), 6000);
  }, [score, waveCount, latestEntry, handleShareScore]);

  // Get hero face for preview
  const heroFaceData = localStorage.getItem("dz_game_hero_face");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
      data-ocid="leaderboard-modal"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="game-hud-bg rounded-2xl p-5 max-w-sm w-full mx-4 relative"
        style={{
          border: "2px solid rgba(240,192,64,0.45)",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors"
          style={{ color: "#f0c040" }}
          aria-label="Close leaderboard"
          data-ocid="leaderboard-close-btn"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center pr-8 flex-shrink-0">
          <div
            className="text-2xl font-black tracking-wide"
            style={{
              color: "#f0c040",
              textShadow: "0 0 16px rgba(240,192,64,0.5)",
            }}
          >
            🏆 Weekly Leaderboard
          </div>
          <div
            className="text-sm font-semibold mt-0.5"
            style={{ color: "#00ff88" }}
          >
            Digital Zindagi: Real Human
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#888" }}>
            📅 {weekRange.start} — {weekRange.end}
          </div>
        </div>

        {/* Selfie share preview (when no native share) */}
        {selfieShareMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 flex-shrink-0"
            style={{
              background: "rgba(240,192,64,0.1)",
              border: "1px solid rgba(240,192,64,0.3)",
            }}
          >
            <div className="flex items-start gap-3">
              {heroFaceData && (
                <img
                  src={heroFaceData}
                  alt="Hero"
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  style={{ border: "2px solid #f0c040" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: "#f0c040" }}
                >
                  📸 Save & Share Karo
                </div>
                <div className="text-xs break-words" style={{ color: "#ccc" }}>
                  {selfieShareMsg}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(selfieShareMsg)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                  }}
                >
                  📲 WhatsApp Bhejo
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="text-4xl">🎮</div>
              <div className="text-base font-bold" style={{ color: "#aaa" }}>
                Is hafte koi score nahi!
              </div>
              <div className="text-sm text-center" style={{ color: "#666" }}>
                Pehle khelo aur top spot claim karo!
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div
                className="grid gap-1 px-2 pb-1"
                style={{
                  gridTemplateColumns: "36px 1fr 64px 36px 32px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {["#", "Player", "Score", "Wave", "Date"].map((h) => (
                  <div
                    key={h}
                    className="text-xs font-bold opacity-50 text-center"
                    style={{ color: "#aaa" }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {entries.map((entry, idx) => {
                const isLatest = latestEntry?.id === entry.id;
                const bg =
                  ROW_BG[idx] ??
                  (isLatest
                    ? "rgba(0,255,136,0.08)"
                    : "rgba(255,255,255,0.03)");
                const border =
                  ROW_BORDER[idx] ??
                  (isLatest ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.06)");

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="grid gap-1 px-2 py-2 rounded-xl items-center"
                    style={{
                      gridTemplateColumns: "36px 1fr 64px 36px 32px",
                      background: bg,
                      border: `1px solid ${border}`,
                    }}
                    data-ocid={`leaderboard-row-${idx}`}
                  >
                    {/* Rank */}
                    <div
                      className="text-center text-base font-bold"
                      style={{ color: idx < 3 ? "#f0c040" : "#888" }}
                    >
                      {rankMedal(idx + 1)}
                    </div>
                    {/* Player */}
                    <div
                      className="text-xs font-semibold truncate"
                      style={{ color: isLatest ? "#00ff88" : "#ddd" }}
                      title={entry.playerName}
                    >
                      {isLatest ? "YOU 👑" : entry.playerName}
                    </div>
                    {/* Score */}
                    <div
                      className="text-sm font-bold text-center"
                      style={{ color: "#f0c040" }}
                    >
                      {entry.score.toLocaleString()}
                    </div>
                    {/* Wave */}
                    <div
                      className="text-xs text-center font-semibold"
                      style={{ color: "#00ff88" }}
                    >
                      W{entry.wave}
                    </div>
                    {/* Date */}
                    <div
                      className="text-xs text-center opacity-60"
                      style={{ color: "#aaa" }}
                    >
                      {formatDate(entry.timestamp)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleShareScore()}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: "#25D36620",
              color: "#25D366",
              border: "1px solid #25D36650",
            }}
            data-ocid="leaderboard-whatsapp-share-btn"
          >
            📲 WhatsApp Share
          </button>
          {heroFaceData && (
            <button
              type="button"
              onClick={handleShareSelfie}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: "rgba(240,192,64,0.12)",
                color: "#f0c040",
                border: "1px solid rgba(240,192,64,0.35)",
              }}
              data-ocid="leaderboard-selfie-share-btn"
            >
              🤳 Hero Share
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#aaa",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            data-ocid="leaderboard-close-bottom-btn"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
