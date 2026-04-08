import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";

const STORAGE_KEY = "dz_game_hero_face";

export default function PhotoUpload() {
  const { heroFace, setHeroFace } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore face from localStorage on mount
  useEffect(() => {
    if (!heroFace) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHeroFace(saved);
    }
  }, [heroFace, setHeroFace]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        // Create 128x128 circular-cropped canvas
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Circular clip
        ctx.beginPath();
        ctx.arc(64, 64, 64, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Center-crop to square (focus top for face)
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        // Slight top bias for face focus
        const sy = Math.min(img.height * 0.05, img.height - size);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);

        const base64 = canvas.toDataURL("image/jpeg", 0.88);
        localStorage.setItem(STORAGE_KEY, base64);
        setHeroFace(base64);
        URL.revokeObjectURL(url);
      };
      img.src = url;
      e.target.value = "";
    },
    [setHeroFace],
  );

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHeroFace(null);
  }, [setHeroFace]);

  return (
    <div
      className="w-full flex flex-col items-center gap-3"
      data-ocid="photo-upload"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="face-file-input"
      />

      {heroFace ? (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Circular face preview with gold ring */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <img
                src={heroFace}
                alt="Hero face preview"
                className="w-20 h-20 rounded-full object-cover"
                style={{
                  border: "3px solid #f0c040",
                  boxShadow:
                    "0 0 20px rgba(240,192,64,0.5), 0 0 40px rgba(240,192,64,0.2)",
                }}
              />
              {/* Animated outer ring */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: "2px solid rgba(0,255,136,0.5)",
                  transform: "scale(1.12)",
                  animation: "spin 6s linear infinite",
                }}
              />
            </div>
            <div
              className="text-xs font-bold tracking-wide"
              style={{ color: "#00ff88" }}
            >
              ✓ Your Hero Face
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                border: "1px solid #f0c040",
                color: "#f0c040",
                background: "rgba(240,192,64,0.08)",
              }}
              data-ocid="change-face-btn"
            >
              <RefreshCw size={14} />🔄 Change Karo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2.5 rounded-xl text-xs flex items-center gap-1 transition-all hover:bg-red-900/30"
              style={{
                color: "#ff6666",
                border: "1px solid rgba(255,100,100,0.25)",
              }}
              aria-label="Remove face"
              data-ocid="remove-face-btn"
            >
              <Trash2 size={13} />
              हटाएं
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-3">
          {/* Placeholder DZ circle */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all hover:scale-105"
              style={{
                border: "2px dashed rgba(240,192,64,0.5)",
                background:
                  "radial-gradient(circle, rgba(6,68,32,0.85) 0%, rgba(2,5,3,0.85) 100%)",
                color: "#f0c040",
              }}
              aria-label="Upload hero face"
              data-ocid="upload-face-circle-btn"
            >
              <Camera size={24} style={{ color: "#f0c040" }} />
              <span
                className="text-xs mt-1 font-bold"
                style={{ color: "#f0c040" }}
              >
                DZ
              </span>
            </button>
            <div
              className="text-xs text-center opacity-60"
              style={{ color: "#ccc" }}
            >
              अपना चेहरा लगाओ
            </div>
          </div>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{
              border: "1px dashed rgba(240,192,64,0.5)",
              color: "#f0c040",
              background: "rgba(240,192,64,0.06)",
            }}
            data-ocid="upload-face-btn"
          >
            📷 Photo Upload Karo
          </button>
        </div>
      )}
    </div>
  );
}
