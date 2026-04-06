import {
  ArrowLeft,
  Download,
  ImageIcon,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useNavigate } from "../lib/router";

type EnhanceMode = "sharpen" | "contrast" | "both" | "denoise";

export default function AIEnhancerPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<EnhanceMode>("both");
  const [sharpenLevel, setSharpenLevel] = useState(1.5);
  const [contrastLevel, setContrastLevel] = useState(1.3);
  const [brightnessLevel, setBrightnessLevel] = useState(1.1);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image files select karein");
      return;
    }
    setOriginalFile(file);
    setOutputUrl(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  // Unsharp mask convolution kernel for sharpening
  const applySharpen = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number,
  ) => {
    const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
    const copy = new Uint8ClampedArray(data);
    const w = width;
    const h = height;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const ki = (ky + 1) * 3 + (kx + 1);
              const pi = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += copy[pi] * kernel[ki];
            }
          }
          const idx = (y * w + x) * 4 + c;
          data[idx] = Math.min(255, Math.max(0, copy[idx] + sum * amount));
        }
      }
    }
  };

  const applyContrastBrightness = (
    data: Uint8ClampedArray,
    contrast: number,
    brightness: number,
  ) => {
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = data[i + c];
        // Brightness
        v = v * brightness;
        // Contrast: shift to center, scale, shift back
        v = (v - 128) * contrast + 128;
        data[i + c] = Math.min(255, Math.max(0, v));
      }
    }
  };

  // Simple denoise: average with neighbors
  const applyDenoise = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) => {
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += copy[((y + dy) * width + (x + dx)) * 4 + c];
              cnt++;
            }
          }
          data[(y * width + x) * 4 + c] = Math.round(sum / cnt);
        }
      }
    }
  };

  const processImage = async () => {
    if (!originalFile || !canvasRef.current) return;
    setProcessing(true);
    try {
      const img = new Image();
      const objUrl = URL.createObjectURL(originalFile);
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.src = objUrl;
      });

      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objUrl);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      if (mode === "denoise") {
        applyDenoise(data, canvas.width, canvas.height);
      } else {
        if (mode === "contrast" || mode === "both") {
          applyContrastBrightness(data, contrastLevel, brightnessLevel);
        }
        if (mode === "sharpen" || mode === "both") {
          applySharpen(data, canvas.width, canvas.height, sharpenLevel);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setOutputUrl(dataUrl);
      toast.success("Image enhance ho gayi! Download karein.");
    } catch {
      toast.error("Image process karne mein error aaya");
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `enhanced_${originalFile?.name ?? "image"}.jpg`;
    a.click();
  };

  const modes: {
    key: EnhanceMode;
    label: string;
    desc: string;
    icon: string;
  }[] = [
    {
      key: "both",
      label: "Full Enhance",
      desc: "Sharpen + Contrast dono",
      icon: "✨",
    },
    { key: "sharpen", label: "Sharpen", desc: "Blur kam karo", icon: "🔍" },
    { key: "contrast", label: "Contrast", desc: "Photo saaf karo", icon: "☀️" },
    { key: "denoise", label: "Denoise", desc: "Grain/noise hatao", icon: "🌫️" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={16} /> Home
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              AI Image Enhancer
            </h1>
            <p className="text-xs text-muted-foreground">
              Blurry photos/documents clear karein — no paid APIs
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Upload */}
          <label
            htmlFor="ai-img-upload"
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-violet-300 rounded-2xl p-8 bg-violet-50 cursor-pointer hover:border-violet-500 hover:bg-violet-100 transition-colors"
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-36 object-contain rounded-xl"
              />
            ) : (
              <>
                <Wand2 size={40} className="text-violet-400" />
                <p className="text-sm font-semibold text-violet-600">
                  Gallery se blurry photo choose karein
                </p>
                <p className="text-xs text-muted-foreground">
                  Documents, Aadhaar, marksheets, etc.
                </p>
              </>
            )}
            <input
              id="ai-img-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {originalFile && (
            <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
              {/* Mode Selection */}
              <h3 className="font-semibold text-sm text-foreground">
                Enhance Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {modes.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-left transition-colors ${
                      mode === m.key
                        ? "border-violet-500 bg-violet-50"
                        : "border-border bg-white hover:border-violet-200"
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-xs font-bold text-foreground">
                      {m.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>

              {(mode === "sharpen" || mode === "both") && (
                <div>
                  <label
                    htmlFor="sharpen-slider"
                    className="text-xs text-muted-foreground block mb-1"
                  >
                    Sharpen Level:{" "}
                    <span className="text-foreground font-semibold">
                      {sharpenLevel.toFixed(1)}
                    </span>
                  </label>
                  <input
                    id="sharpen-slider"
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={sharpenLevel}
                    onChange={(e) => setSharpenLevel(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
              )}

              {(mode === "contrast" || mode === "both") && (
                <>
                  <div>
                    <label
                      htmlFor="contrast-slider"
                      className="text-xs text-muted-foreground block mb-1"
                    >
                      Contrast:{" "}
                      <span className="text-foreground font-semibold">
                        {contrastLevel.toFixed(1)}
                      </span>
                    </label>
                    <input
                      id="contrast-slider"
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.1}
                      value={contrastLevel}
                      onChange={(e) => setContrastLevel(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="brightness-slider"
                      className="text-xs text-muted-foreground block mb-1"
                    >
                      Brightness:{" "}
                      <span className="text-foreground font-semibold">
                        {brightnessLevel.toFixed(1)}
                      </span>
                    </label>
                    <input
                      id="brightness-slider"
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={brightnessLevel}
                      onChange={(e) =>
                        setBrightnessLevel(Number(e.target.value))
                      }
                      className="w-full accent-violet-600"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={processImage}
                disabled={processing}
                className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {processing
                  ? "Enhancing... (thoda wait karein)"
                  : "✨ Enhance Image"}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                Browser mein process hota hai — koi data upload nahi hota
              </p>
            </div>
          )}

          {/* Output */}
          {outputUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-violet-200 p-4 space-y-3"
            >
              <p className="font-semibold text-sm text-violet-700">
                ✅ Enhanced Image Ready!
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">
                    Before
                  </p>
                  <img
                    src={preview!}
                    alt="Before"
                    className="w-full h-32 object-contain rounded-xl border border-border bg-gray-50"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 text-center">
                    After
                  </p>
                  <img
                    src={outputUrl}
                    alt="After"
                    className="w-full h-32 object-contain rounded-xl border border-violet-200 bg-violet-50"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={downloadImage}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Enhanced Image
              </button>
            </motion.div>
          )}
        </motion.div>
      </main>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <Footer />
    </div>
  );
}
