import { Play, Youtube } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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
  // Returns true if ads can be shown (interval has passed)
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

function getVideoThumbnail(row: SheetRow): string | null {
  const url = row.videoLink;
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)?([\w-]{11})/,
  );
  if (ytMatch && (url.includes("youtube") || url.includes("youtu.be"))) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  }
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return null; // Facebook thumbnails require API auth
  }
  if (url.includes("instagram.com")) {
    return null;
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
  return <Youtube size={14} className="text-gray-400" />;
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

// Detect AdBlock
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

export default function VideoGallery() {
  const [allRows, setAllRows] = useState<SheetRow[]>([]);
  const [activePlatform, setActivePlatform] = useState<Platform>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [playingVideo, setPlayingVideo] = useState<SheetRow | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialPhase, setInterstitialPhase] = useState<"pre" | "post">(
    "pre",
  );
  const [pendingVideo, setPendingVideo] = useState<SheetRow | null>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [showAdBlockPopup, setShowAdBlockPopup] = useState(false);
  const [customAds, setCustomAds] = useState<string[]>([]);
  const adMobConfig = useRef(getAdMobConfig());
  const adCheckDone = useRef(false);

  useEffect(() => {
    const filterRows = () => {
      const st = readSectionTogglesVG();
      return getSheetData().filter((r) => {
        if (!r.videoLink || r.status === "inactive") return false;
        const p = (r.platform ?? "").toLowerCase();
        if ((p === "youtube" || p === "yt") && !st.dz_section_youtube)
          return false;
        if ((p === "facebook" || p === "fb") && !st.dz_section_facebook)
          return false;
        if ((p === "instagram" || p === "ig") && !st.dz_section_instagram)
          return false;
        return true;
      });
    };
    const rows = filterRows();
    setAllRows(rows);
    setCustomAds(getCustomInternalAds());

    const handleStorage = () => {
      const updated = filterRows();
      setAllRows(updated);
      adMobConfig.current = getAdMobConfig();
      setCustomAds(getCustomInternalAds());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, []);

  // Detect adblock once
  useEffect(() => {
    if (adCheckDone.current) return;
    adCheckDone.current = true;
    detectAdBlock().then((blocked) => setAdBlocked(blocked));
  }, []);

  // Platform filter
  const platformFiltered =
    activePlatform === "all"
      ? allRows
      : allRows.filter((r) => getPlatformKey(r.platform) === activePlatform);

  // Category filter
  const categories = [
    "all",
    ...Array.from(
      new Set(allRows.map((r) => r.category?.trim()).filter(Boolean)),
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

  const handlePlayClick = async (row: SheetRow) => {
    // Check adblock
    const blocked = await detectAdBlock();
    setAdBlocked(blocked);

    if (blocked && isAdMobEnabled) {
      // If adblocked + admob enabled → show custom internal ad or popup
      if (customAds.length > 0) {
        // Bypass: show custom internal ad instead
        setPendingVideo(row);
        setInterstitialPhase("pre");
        setShowInterstitial(true);
      } else {
        setShowAdBlockPopup(true);
      }
      return;
    }

    if (isAdMobEnabled && interstitialId && checkAdFrequency()) {
      // Show pre-video interstitial (frequency-controlled)
      markAdShown();
      setPendingVideo(row);
      setInterstitialPhase("pre");
      setShowInterstitial(true);
    } else {
      setPlayingVideo(row);
    }
  };

  const handleInterstitialClose = () => {
    setShowInterstitial(false);
    if (interstitialPhase === "pre" && pendingVideo) {
      setPlayingVideo(pendingVideo);
    } else {
      setPendingVideo(null);
    }
  };

  const handleVideoClose = () => {
    const closedVideo = playingVideo;
    setPlayingVideo(null);
    if (isAdMobEnabled && interstitialId && closedVideo) {
      // Show post-video interstitial
      setPendingVideo(closedVideo);
      setInterstitialPhase("post");
      setShowInterstitial(true);
    }
  };

  if (allRows.length === 0) return null;

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
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700"
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
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="relative group rounded-2xl overflow-hidden bg-gray-900 shadow-md cursor-pointer"
                    style={{ aspectRatio: "16/9" }}
                    onClick={() => handlePlayClick(row)}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={row.category || "Video"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
                        {getPlatformIcon(row.platform)}
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <Play
                          size={22}
                          className="text-gray-900 ml-1"
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

      {/* AdBlock Popup */}
      {showAdBlockPopup && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-3">🚫</div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              AdBlocker Detected!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please disable your AdBlocker to watch this video. Yeh app free
              content ke liye ads par depend karta hai.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAdBlockPopup(false);
                  setPlayingVideo(pendingVideo);
                  setPendingVideo(null);
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
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

      {/* Interstitial Ad */}
      {showInterstitial && (
        <InterstitialAd
          phase={interstitialPhase}
          adBlocked={adBlocked}
          customAds={customAds}
          onClose={handleInterstitialClose}
        />
      )}

      {/* Video Player */}
      {playingVideo && (
        <VideoPlayer
          url={playingVideo.videoLink}
          title={playingVideo.category || "Video"}
          onClose={handleVideoClose}
        />
      )}
    </>
  );
}
