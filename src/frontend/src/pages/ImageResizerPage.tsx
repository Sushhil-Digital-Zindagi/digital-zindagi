import {
  ArrowLeft,
  Download,
  ImageIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useNavigate } from "../lib/router";

export default function ImageResizerPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [outputSize, setOutputSize] = useState(0);
  const [originalDims, setOriginalDims] = useState({ w: 0, h: 0 });
  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");
  const [quality, setQuality] = useState(80);
  const [targetKB, setTargetKB] = useState("");
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image files select karein (JPG/PNG)");
      return;
    }
    setOriginalFile(file);
    setOriginalSize(file.size);
    setOutputUrl(null);
    setOutputSize(0);
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
      setWidth(String(img.naturalWidth));
      setHeight(String(img.naturalHeight));
    };
    img.src = url;
  };

  const handleWidthChange = (v: string) => {
    setWidth(v);
    if (maintainAspect && originalDims.w && originalDims.h) {
      const ratio = originalDims.h / originalDims.w;
      setHeight(String(Math.round(Number(v) * ratio)));
    }
  };

  const handleHeightChange = (v: string) => {
    setHeight(v);
    if (maintainAspect && originalDims.w && originalDims.h) {
      const ratio = originalDims.w / originalDims.h;
      setWidth(String(Math.round(Number(v) * ratio)));
    }
  };

  const processImage = async () => {
    if (!originalFile || !canvasRef.current) return;
    setProcessing(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(originalFile);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = objectUrl;
      });

      const canvas = canvasRef.current;
      const targetW = Math.max(
        1,
        Math.min(4096, Number(width) || originalDims.w),
      );
      const targetH = Math.max(
        1,
        Math.min(4096, Number(height) || originalDims.h),
      );
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      URL.revokeObjectURL(objectUrl);

      let q = quality / 100;
      let dataUrl = canvas.toDataURL("image/jpeg", q);

      // If target KB specified, iterate quality down
      if (targetKB) {
        const maxBytes = Number(targetKB) * 1024;
        let iterations = 0;
        while (
          dataUrl.length * 0.75 > maxBytes &&
          q > 0.05 &&
          iterations < 20
        ) {
          q -= 0.05;
          dataUrl = canvas.toDataURL("image/jpeg", q);
          iterations++;
        }
      }

      setOutputUrl(dataUrl);
      // Approximate size from base64
      const approxBytes = Math.round(
        (dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75,
      );
      setOutputSize(approxBytes);
      toast.success("Image resize ho gayi! Download button se save karein.");
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
    a.download = `resized_${originalFile?.name ?? "image"}.jpg`;
    a.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

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
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <ImageIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Image Resizer
            </h1>
            <p className="text-xs text-muted-foreground">
              Exam form ke liye photo compress karein
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <label
            htmlFor="img-upload"
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-purple-300 rounded-2xl p-8 bg-purple-50 cursor-pointer hover:border-purple-500 hover:bg-purple-100 transition-colors"
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-36 object-contain rounded-xl"
              />
            ) : (
              <>
                <ImageIcon size={40} className="text-purple-400" />
                <p className="text-sm font-semibold text-purple-600">
                  Gallery se photo choose karein
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG support
                </p>
              </>
            )}
            {originalFile && (
              <p className="text-xs text-purple-600 font-medium">
                Original: {originalDims.w}×{originalDims.h}px |{" "}
                {formatSize(originalSize)}
              </p>
            )}
            <input
              id="img-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {/* Settings */}
          {originalFile && (
            <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">
                Resize Settings
              </h3>

              {/* Dimension inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="width-input"
                    className="text-xs text-muted-foreground block mb-1"
                  >
                    Width (px)
                  </label>
                  <input
                    id="width-input"
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label
                    htmlFor="height-input"
                    className="text-xs text-muted-foreground block mb-1"
                  >
                    Height (px)
                  </label>
                  <input
                    id="height-input"
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Aspect ratio lock */}
              <label
                htmlFor="aspect-ratio"
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  id="aspect-ratio"
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-xs text-foreground">
                  Aspect ratio maintain karein
                </span>
                {maintainAspect ? (
                  <Maximize2 size={14} className="text-purple-600" />
                ) : (
                  <Minimize2 size={14} className="text-muted-foreground" />
                )}
              </label>

              {/* Quality slider */}
              <div>
                <label
                  htmlFor="quality-slider"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Quality:{" "}
                  <span className="text-foreground font-semibold">
                    {quality}%
                  </span>
                </label>
                <input
                  id="quality-slider"
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Target size */}
              <div>
                <label
                  htmlFor="target-kb"
                  className="text-xs text-muted-foreground block mb-1"
                >
                  Target Size (KB) — optional
                </label>
                <input
                  id="target-kb"
                  type="number"
                  placeholder="e.g. 100 for ~100KB"
                  value={targetKB}
                  onChange={(e) => setTargetKB(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Passport (200×200)", w: 200, h: 200 },
                  { label: "Aadhaar (600×400)", w: 600, h: 400 },
                  { label: "Exam Form (800×600)", w: 800, h: 600 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setWidth(String(p.w));
                      setHeight(String(p.h));
                      setMaintainAspect(false);
                    }}
                    className="text-xs bg-purple-50 text-purple-700 font-medium px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={processImage}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <RotateCcw size={16} className="animate-spin" />
                ) : (
                  <ImageIcon size={16} />
                )}
                {processing ? "Processing..." : "Resize & Compress"}
              </button>
            </div>
          )}

          {/* Output */}
          {outputUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-green-200 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                ✅ Image ready!
                <span className="ml-auto text-xs text-muted-foreground">
                  {width}×{height}px | {formatSize(outputSize)}
                </span>
              </div>
              <img
                src={outputUrl}
                alt="Output"
                className="w-full max-h-48 object-contain rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={downloadImage}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Image
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
