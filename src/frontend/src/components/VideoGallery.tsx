import { Play, Youtube } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useVideos } from "../hooks/useQueries";
import type { VideoItem } from "../types/appTypes";
import type { SheetRow } from "../utils/googleSheetsSync";
import { getSheetData } from "../utils/googleSheetsSync";
import InterstitialAd from "./InterstitialAd";
import VideoPlayer from "./VideoPlayer";

function readSectionTogglesVG(): Record<string, boolean> {
  const keys = [
    "dz_section_youtube",
    "dz_section_facebook",
    "dz_section_instagram",
  ];
  const result: Record<string, boolean> = {};
  for (const k of keys) {
    const val = localStorage.getItem(k);
    result[k] = val === null ? true : val === "true";
  }
  return result;
}

function checkAdFrequency(): boolean {
  const intervalHours = Number(
    localStorage.getItem("dz_ad_interval_hours") ?? "4",
  );
  const lastShown = Number(localStorage.getItem("dz_ad_last_shown") ?? "0");
  const elapsed = (Date.now() - lastShown) / (1000 * 60 * 60);
  return elapsed >= intervalHours;
}

function markAdShown(): void {
  localStorage.setItem("dz_ad_last_shown", String(Date.now()));
}

type Platform = "all" | "youtube" | "facebook" | "instagram";

function getPlatformKey(platform: string): Platform {
  const p = platform.toLowerCase().trim();
  if (p === "youtube" || p === "yt") return "youtube";
  if (p === "facebook" || p === "fb") return "facebook";
  if (p === "instagram" || p === "ig") return "instagram";
  return "all";
}

// Unified video row — wraps both SheetRow and VideoItem
interface UnifiedRow {
  id: string;
  videoLink: string;
  platform: string;
  category: string;
  title: string;
  thumbnailUrl?: string;
}

function sheetToUnified(row: SheetRow): UnifiedRow {
  return {
    id: row.id,
    videoLink: row.videoLink,
    platform: row.platform ?? "",
    category: row.category ?? "",
    title: row.category ?? "",
  };
}

function canisterToUnified(v: VideoItem): UnifiedRow {
  return {
    id: `c_${v.id}`,
    videoLink: v.videoUrl,
    platform: v.platform,
    category: v.category,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl || undefined,
  };
}

function getVideoThumbnail(row: UnifiedRow): string | null {
  if (row.thumbnailUrl) return row.thumbnailUrl;
  const url = row.videoLink;
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)?([\w-]{11})/,
  );
  if (ytMatch && (url.includes("youtube") || url.includes("youtu.be"))) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  }
  return null;
}

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("youtube") || p === "yt") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-sm">
        <svg
          viewBox="0 0 24 24"
          fill="white"
          width="12"
          height="12"
          aria-label="YouTube"
        >
          <title>YouTube</title>
          <path d="M23.8 7.2s-.2-1.7-1-2.4c-.9-1-1.9-1-2.4-1.1C17.2 3.5 12 3.5 12 3.5s-5.2 0-8.4.2c-.5.1-1.5.1-2.4 1.1-.7.7-1 2.4-1 2.4S0 9.1 0 11v1.8c0 1.9.2 3.8.2 3.8s.2 1.7 1 2.4c.9 1 2.1.9 2.6 1C5.6 20.3 12 20.3 12 20.3s5.2 0 8.4-.3c.5-.1 1.5-.1 2.4-1.1.7-.7 1-2.4 1-2.4s.2-1.9.2-3.8V11c0-1.9-.2-3.8-.2-3.8zM9.5 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
      </span>
    );
  }
  if (p.includes("facebook") || p === "fb") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 rounded-sm">
        <svg
          viewBox="0 0 24 24"
          fill="white"
          width="12"
          height="12"
          aria-label="Facebook"
        >
          <title>Facebook</title>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </span>
    );
  }
  if (p.includes("instagram") || p === "ig") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
        <svg
          viewBox="0 0 24 24"
          fill="white"
          width="12"
          height="12"
          aria-label="Instagram"
        >
          <title>Instagram</title>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    );
  }
  return <Youtube size={14} className="text-muted-foreground" />;
}

function getAdMobConfig() {
  try {
    return JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}");
  } catch {
    return {};
  }
}

function getCustomInternalAds(): string[] {
  try {
    const raw = localStorage.getItem("dz_custom_internal_ads");
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function detectAdBlock(): Promise<boolean> {
  try {
    await fetch(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      { method: "HEAD", mode: "no-cors", cache: "no-store" },
    );
    return false;
  } catch {
    return true;
  }
}

function buildUnifiedRows(
  canisterVideos: VideoItem[] | undefined,
  sheetRows: UnifiedRow[],
): UnifiedRow[] {
  const canisterRows = (canisterVideos ?? [])
    .filter((v) => v.enabled)
    .map(canisterToUnified);
  const seen = new Set<string>();
  const result: UnifiedRow[] = [];
  for (const row of [...canisterRows, ...sheetRows]) {
    if (!seen.has(row.videoLink)) {
      seen.add(row.videoLink);
      result.push(row);
    }
  }
  return result;
}

// Ad gate states for strict pre/post-roll enforcement
type AdGateState =
  | "idle" // No ad, no video — normal gallery view
  | "pre_ad" // Pre-roll ad showing; video player blocked
  | "playing" // Video player open
  | "post_ad"; // Post-roll ad showing; video selection blocked

export default function VideoGallery() {
  const [sheetRows, setSheetRows] = useState<UnifiedRow[]>([]);
  const [activePlatform, setActivePlatform] = useState<Platform>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [adGate, setAdGate] = useState<AdGateState>("idle");
  const [currentVideo, setCurrentVideo] = useState<UnifiedRow | null>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [showAdBlockPopup, setShowAdBlockPopup] = useState(false);
  const [customAds, setCustomAds] = useState<string[]>([]);
  const adMobConfig = useRef(getAdMobConfig());
  const adCheckDone = useRef(false);

  // Poll canister videos every 2 seconds
  const { data: canisterVideos } = useVideos();

  useEffect(() => {
    const filterRows = () => {
      const st = readSectionTogglesVG();
      return getSheetData()
        .filter((r) => {
          if (!r.videoLink || r.status === "inactive") return false;
          const p = (r.platform ?? "").toLowerCase();
          if ((p === "youtube" || p === "yt") && !st.dz_section_youtube)
            return false;
          if ((p === "facebook" || p === "fb") && !st.dz_section_facebook)
            return false;
          if ((p === "instagram" || p === "ig") && !st.dz_section_instagram)
            return false;
          return true;
        })
        .map(sheetToUnified);
    };
    setSheetRows(filterRows());
    setCustomAds(getCustomInternalAds());

    const handleStorage = () => {
      setSheetRows(filterRows());
      adMobConfig.current = getAdMobConfig();
      setCustomAds(getCustomInternalAds());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    window.addEventListener("dz-settings-changed", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
      window.removeEventListener("dz-settings-changed", handleStorage);
    };
  }, []);

  // Detect adblock once
  useEffect(() => {
    if (adCheckDone.current) return;
    adCheckDone.current = true;
    detectAdBlock().then((blocked) => setAdBlocked(blocked));
  }, []);

  // Merge canister + sheet rows, deduplicated
  const allRows = buildUnifiedRows(canisterVideos, sheetRows);

  // Apply platform section toggles
  const st = readSectionTogglesVG();
  const filteredByToggle = allRows.filter((r) => {
    const p = getPlatformKey(r.platform);
    if (p === "youtube" && !st.dz_section_youtube) return false;
    if (p === "facebook" && !st.dz_section_facebook) return false;
    if (p === "instagram" && !st.dz_section_instagram) return false;
    return true;
  });

  // Platform filter
  const platformFiltered =
    activePlatform === "all"
      ? filteredByToggle
      : filteredByToggle.filter(
          (r) => getPlatformKey(r.platform) === activePlatform,
        );

  // Category filter
  const categories = [
    "all",
    ...Array.from(
      new Set(filteredByToggle.map((r) => r.category?.trim()).filter(Boolean)),
    ),
  ];

  const filtered =
    activeCategory === "all"
      ? platformFiltered
      : platformFiltered.filter(
          (r) =>
            r.category?.trim().toLowerCase() === activeCategory.toLowerCase(),
        );

  const isAdMobEnabled =
    adMobConfig.current.masterEnabled !== false &&
    adMobConfig.current.interstitialEnabled;
  const interstitialId = adMobConfig.current.interstitialId;

  // Determine whether an ad should be shown at all (frequency throttle applies)
  const shouldShowAd = (): boolean => {
    if (!isAdMobEnabled) return false;
    // Even if no AdMob ID, show fallback if adBlocked (custom ads or branded placeholder)
    return checkAdFrequency();
  };

  const handlePlayClick = async (row: UnifiedRow) => {
    const blocked = await detectAdBlock();
    setAdBlocked(blocked);

    // If AdBlock detected and AdMob is enabled, use custom ads bypass
    if (blocked && isAdMobEnabled) {
      if (customAds.length > 0) {
        // Show interstitial with custom ads (no bypass possible — ad gate)
        markAdShown();
        setCurrentVideo(row);
        setAdGate("pre_ad");
      } else {
        // No custom ads available — inform user and still require them to acknowledge
        setCurrentVideo(row);
        setShowAdBlockPopup(true);
      }
      return;
    }

    if (isAdMobEnabled && shouldShowAd()) {
      // Pre-roll ad gate: block video until ad countdown completes
      markAdShown();
      setCurrentVideo(row);
      setAdGate("pre_ad");
    } else {
      // Ad frequency throttle active (window not expired) — go straight to video
      setCurrentVideo(row);
      setAdGate("playing");
    }
  };

  // Called when interstitial ad countdown completes and user taps skip
  const handleInterstitialClose = () => {
    if (adGate === "pre_ad") {
      // Pre-roll done — open video player
      setAdGate("playing");
    } else if (adGate === "post_ad") {
      // Post-roll done — reset everything, allow next video selection
      setAdGate("idle");
      setCurrentVideo(null);
    }
  };

  // Called when VideoPlayer is closed by user (X button)
  const handleVideoClose = () => {
    if (isAdMobEnabled && interstitialId && currentVideo) {
      // Show post-roll ad before allowing next video
      setAdGate("post_ad");
    } else {
      // No post-roll configured — reset immediately
      setAdGate("idle");
      setCurrentVideo(null);
    }
  };

  if (filteredByToggle.length === 0) return null;

  const platformTabs: { key: Platform; label: string }[] = [
    { key: "all", label: "सभी" },
    { key: "youtube", label: "YouTube" },
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
  ];

  return (
    <>
      <section
        data-ocid="video_gallery.section"
        className="max-w-7xl mx-auto px-4 py-6 border-t border-border"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading font-bold text-2xl text-foreground">
              🎬 Video Gallery
            </h2>
          </div>

          {/* Primary Filter — Platform Tabs */}
          <div
            className="flex gap-2 overflow-x-auto pb-2 mb-3"
            style={{ scrollbarWidth: "none" }}
          >
            {platformTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActivePlatform(tab.key);
                  setActiveCategory("all");
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activePlatform === tab.key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.key !== "all" && getPlatformIcon(tab.key)}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary Filter — Category Buttons */}
          {categories.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto pb-3 mb-4"
              style={{ scrollbarWidth: "none" }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? "सभी Categories" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Video Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-3xl mb-2">🎬</p>
              <p className="text-sm">Is filter mein koi video nahi hai</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((row) => {
                const thumb = getVideoThumbnail(row);
                // Block clicks while post-roll ad is pending
                const isLocked = adGate === "post_ad" || adGate === "pre_ad";
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`relative group rounded-2xl overflow-hidden bg-card shadow-md ${
                      isLocked
                        ? "opacity-50 pointer-events-none"
                        : "cursor-pointer"
                    }`}
                    style={{ aspectRatio: "16/9" }}
                    onClick={() => !isLocked && handlePlayClick(row)}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={row.category || "Video"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center">
                        {getPlatformIcon(row.platform)}
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <Play
                          size={22}
                          className="text-foreground ml-1"
                          fill="currentColor"
                        />
                      </div>
                    </div>

                    {/* Always visible play icon (mobile) */}
                    <div className="absolute bottom-2 right-2">
                      <div className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                        <Play
                          size={14}
                          className="text-white ml-0.5"
                          fill="currentColor"
                        />
                      </div>
                    </div>

                    {/* Platform badge */}
                    <div className="absolute top-2 left-2">
                      {getPlatformIcon(row.platform)}
                    </div>

                    {/* Category label */}
                    {row.category && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full max-w-[70%] truncate">
                        {row.category}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </section>

      {/* AdBlock Popup — user must acknowledge before video plays */}
      {showAdBlockPopup && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">🚫</div>
            <h3 className="font-bold text-lg text-foreground mb-2">
              AdBlocker Detected!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please disable your AdBlocker to watch this video. Yeh app free
              content ke liye ads par depend karta hai.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAdBlockPopup(false);
                  // Still go through ad gate (branded placeholder) — no direct bypass
                  setAdGate("pre_ad");
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                Phir Bhi Dekho
              </button>
              <button
                type="button"
                onClick={() => setShowAdBlockPopup(false)}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
              >
                Samajh Gaya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interstitial Ad — pre-roll (adGate === "pre_ad") OR post-roll (adGate === "post_ad") */}
      {(adGate === "pre_ad" || adGate === "post_ad") && (
        <InterstitialAd
          phase={adGate === "pre_ad" ? "pre" : "post"}
          adBlocked={adBlocked}
          customAds={customAds}
          onClose={handleInterstitialClose}
        />
      )}

      {/* Video Player — ONLY renders when adGate === "playing", never during ad gate */}
      {adGate === "playing" && currentVideo && (
        <VideoPlayer
          url={currentVideo.videoLink}
          title={currentVideo.title || currentVideo.category || "Video"}
          autoplay={true}
          onClose={handleVideoClose}
        />
      )}
    </>
  );
}
