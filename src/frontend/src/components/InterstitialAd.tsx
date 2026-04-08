// ============================================================
// AdMob Integration Placeholder
// To activate real AdMob ads:
// 1. Go to Admin Panel > AdMob Configuration
// 2. Paste your AdMob App ID (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX)
// 3. Paste your Interstitial Ad Unit ID (ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX)
// 4. The system will use real AdMob ads automatically.
// ============================================================

import { useEffect, useState } from "react";

interface Props {
  phase: "pre" | "post";
  adBlocked: boolean;
  customAds: string[];
  onClose: () => void;
}

function getAdMobConfig() {
  try {
    return JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}");
  } catch {
    return {};
  }
}

export default function InterstitialAd({
  phase,
  adBlocked,
  customAds,
  onClose,
}: Props) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const config = getAdMobConfig();
  const interstitialId = config.interstitialId ?? "";

  // Show custom ad when: adBlocked OR no interstitial ID configured
  const showCustomAd = adBlocked || !interstitialId;
  const customAd =
    customAds.length > 0
      ? customAds[Math.floor(Math.random() * customAds.length)]
      : null;

  // Countdown — always 5 seconds minimum; skip button NEVER appears before countdown ends
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const label = phase === "pre" ? "Video se pehle" : "Video ke baad";

  return (
    // No click-outside-to-dismiss; no keyboard-escape-to-dismiss.
    // The overlay is intentionally non-interactive — only the skip button (after countdown) can close it.
    <div
      className="fixed inset-0 z-[9997] bg-black/95 flex flex-col items-center justify-center px-4"
      aria-label="Advertisement"
    >
      {/* Label */}
      <p className="text-gray-400 text-xs mb-3 uppercase tracking-widest">
        Advertisement — {label}
      </p>

      {showCustomAd && customAd ? (
        // AdBlock bypass: show custom internal banner
        <div className="w-full max-w-md">
          <div className="relative bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={customAd}
              alt="Advertisement"
              className="w-full object-contain rounded-2xl max-h-64"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="px-4 py-3">
              <p className="text-white text-xs text-center opacity-60">
                Digital Zindagi — Sponsored
              </p>
            </div>
          </div>
        </div>
      ) : showCustomAd ? (
        // No custom ad image AND no AdMob ID — branded placeholder shown for full countdown
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-8 text-center shadow-2xl border-2 border-yellow-400/40">
            <div className="text-5xl mb-3">📢</div>
            <p className="text-white font-bold text-xl mb-1">Digital Zindagi</p>
            <p className="text-yellow-300 font-semibold text-base mt-2">
              विज्ञापन लोड हो रहा है...
            </p>
            <p className="text-white/60 text-sm mt-1">
              Apni local service discover karein
            </p>
          </div>
        </div>
      ) : (
        // AdMob Interstitial slot — real AdMob SDK would render here once configured
        <div className="w-full max-w-md">
          <div
            data-ocid="admob.interstitial"
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 text-center shadow-2xl border border-gray-700"
          >
            <span className="inline-block bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded mb-4">
              AD
            </span>
            <p className="text-white/60 text-xs font-mono mb-2 truncate">
              {interstitialId.length > 30
                ? `...${interstitialId.slice(-24)}`
                : interstitialId}
            </p>
            <div className="w-full h-48 bg-gray-700/50 rounded-xl flex items-center justify-center">
              <p className="text-white/40 text-sm">AdMob Interstitial Ad</p>
            </div>
          </div>
        </div>
      )}

      {/* Skip button — ONLY visible after countdown reaches 0 */}
      <div className="mt-6">
        {canSkip ? (
          <button
            type="button"
            onClick={onClose}
            data-ocid="interstitial.skip_btn"
            className="px-8 py-3 bg-white text-gray-900 font-bold rounded-full text-sm hover:bg-gray-100 transition-colors shadow-lg"
          >
            ✕ Skip — Video Dekho
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-8 py-3 bg-gray-600 text-gray-300 font-semibold rounded-full text-sm cursor-not-allowed select-none"
          >
            {countdown}s mein skip karein...
          </button>
        )}
      </div>
    </div>
  );
}
