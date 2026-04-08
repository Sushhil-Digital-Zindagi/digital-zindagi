import { Maximize2, Minimize2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
  autoplay?: boolean;
  onClose: () => void;
}

type Quality = "auto" | "720" | "1080";

const YT_BASE_PARAMS =
  "rel=0&modestbranding=1&showinfo=0&controls=1&enablejsapi=1&fs=1";

function getEmbedUrl(
  url: string,
  quality: Quality = "auto",
  autoplay = false,
): string | null {
  if (!url) return null;

  // Quality param for YouTube (vq= parameter)
  const vq = quality === "1080" ? "hd1080" : quality === "720" ? "hd720" : "";
  const qualityParam = vq ? `&vq=${vq}` : "";
  const autoplayParam = autoplay ? "&autoplay=1" : "";

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/?)([\w-]{11})/,
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?${YT_BASE_PARAMS}${qualityParam}${autoplayParam}`;
  }

  // Facebook video — unchanged
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    const encoded = encodeURIComponent(url);
    return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true`;
  }

  // Instagram — unchanged
  const igMatch = url.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/);
  if (igMatch) {
    return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/`;
  }

  return null;
}

export default function VideoPlayer({
  url,
  title,
  autoplay = false,
  onClose,
}: VideoPlayerProps) {
  const [quality, setQuality] = useState<Quality>("auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embedUrl = getEmbedUrl(url, quality, autoplay);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Set webkit/moz fullscreen attributes via ref — JSX doesn't accept non-standard boolean attrs
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.setAttribute("webkitallowfullscreen", "true");
      iframeRef.current.setAttribute("mozallowfullscreen", "true");
    }
  });

  // Lock screen orientation to landscape when fullscreen on mobile
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        // Try landscape lock
        if (
          (
            screen.orientation as ScreenOrientation & {
              lock?: (o: string) => Promise<void>;
            }
          ).lock
        ) {
          try {
            await (
              screen.orientation as ScreenOrientation & {
                lock: (o: string) => Promise<void>;
              }
            ).lock("landscape");
          } catch {}
        }
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(true); // fallback: CSS fullscreen
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        try {
          screen.orientation.unlock();
        } catch {}
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const isYoutube = url.includes("youtube") || url.includes("youtu.be");

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className={`fixed inset-0 z-[9998] flex items-center justify-center bg-black ${
        isFullscreen ? "" : "bg-opacity-95"
      }`}
      onClick={(e) => {
        // Do NOT close on overlay click — user must use the X button
        if (e.target === overlayRef.current) return;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        ref={containerRef}
        className={`relative bg-black ${
          isFullscreen ? "w-screen h-screen" : "w-full max-w-2xl mx-4"
        }`}
      >
        {/* Top controls bar */}
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-white font-semibold text-xs truncate flex-1 pr-2">
            {title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quality selector (YouTube only) */}
            {isYoutube && (
              <div className="flex items-center gap-1">
                {(["auto", "720", "1080"] as Quality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`text-[11px] px-2 py-1 rounded font-semibold transition-colors ${
                      quality === q
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white border border-white/20"
                    }`}
                  >
                    {q === "auto" ? "Auto" : `${q}p`}
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Fullscreen / Landscape"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-white/80 hover:text-white text-xs p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video frame */}
        {embedUrl ? (
          <div
            className="relative w-full bg-black"
            style={{
              paddingTop: isFullscreen ? "0" : "56.25%",
              height: isFullscreen ? "calc(100vh - 48px)" : undefined,
            }}
          >
            <iframe
              ref={iframeRef}
              key={`${url}-${quality}`}
              src={embedUrl}
              title={title ?? "Video"}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen={true}
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <div className="bg-card rounded-xl p-8 text-center text-muted-foreground text-sm mx-2">
            <p>Yeh video link supported nahi hai.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 underline mt-2 block"
            >
              Browser mein kholein
            </a>
          </div>
        )}

        {/* Mobile: always show landscape hint */}
        {!isFullscreen && (
          <p className="text-white/40 text-center text-[10px] py-1.5">
            📱 Fullscreen ke liye ↖️ button dabao — landscape mode mein best
            dikhega
          </p>
        )}
      </div>
    </div>
  );
}
