import {
  CheckCircle,
  Cloud,
  Crown,
  Loader2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";
import { ALL_CATEGORIES } from "../components/CategoryGrid";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import {
  useAdminConfig,
  useCloudinaryConfig,
  useSubscriptionPricing,
} from "../hooks/useQueries";
import { uploadToCloudinary } from "../lib/cloudinary";
import { Link, useParams } from "../lib/router";
import { SubscriptionPlan } from "../types/appTypes";

const PLAN_LABELS: Record<string, string> = {
  oneMonth: "1 Maah",
  twoMonths: "2 Maah",
  sixMonths: "6 Maah",
  twelveMonths: "12 Maah",
};

const PLAN_DURATION_HINT: Record<string, string> = {
  oneMonth: "30 din",
  twoMonths: "60 din",
  sixMonths: "180 din",
  twelveMonths: "365 din",
};

const PLAN_FEATURES: Record<string, string[]> = {
  oneMonth: [
    "Full profile listing",
    "Search mein dikhein",
    "WhatsApp button",
    "Email support",
  ],
  twoMonths: [
    "Full profile listing",
    "Search mein dikhein",
    "WhatsApp button",
    "Priority listing",
  ],
  sixMonths: [
    "Full profile listing",
    "Search mein dikhein",
    "Priority placement",
    "Email + Call support",
  ],
  twelveMonths: [
    "Full profile listing",
    "Search mein dikhein",
    "Top priority placement",
    "Dedicated support",
    "Featured badge",
  ],
};

function planToBackendEnum(plan: string): SubscriptionPlan {
  if (plan === "twoMonths") return SubscriptionPlan.oneMonth;
  if (plan === "sixMonths") return SubscriptionPlan.threeMonths;
  if (plan === "twelveMonths") return SubscriptionPlan.twelveMonths;
  return SubscriptionPlan.oneMonth;
}

// ─── Photo Crop Modal ──────────────────────────────────────────────────────

interface PhotoCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function PhotoCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: PhotoCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initialCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
        width,
        height,
      );
      setCrop(initialCrop);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!imgRef.current || !crop) {
      toast.error("Pehle crop area select karein");
      return;
    }
    setIsProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      const cropWidth = (crop.width / 100) * img.width;
      const cropHeight = (crop.height / 100) * img.height;
      const cropX = (crop.x / 100) * img.width;
      const cropY = (crop.y / 100) * img.height;

      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      ctx.drawImage(
        img,
        cropX * scaleX,
        cropY * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        outputSize,
        outputSize,
      );

      // Smart compression: try WebP first, fall back to JPEG
      const supportsWebP = canvas
        .toDataURL("image/webp")
        .startsWith("data:image/webp");
      const mimeType = supportsWebP ? "image/webp" : "image/jpeg";

      // Two-pass compression: try quality 0.85 first, then 0.75 if still >300KB
      const tryBlob = (quality: number): Promise<Blob> =>
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b ? resolve(b) : reject(new Error("Canvas conversion failed")),
            mimeType,
            quality,
          );
        });

      let blob = await tryBlob(0.85);
      if (blob.size > 300 * 1024) {
        const compressed = await tryBlob(0.75);
        // Use more compressed version only if it's actually smaller
        if (compressed.size < blob.size) blob = compressed;
      }

      // Log compression ratio (not shown to user)
      const originalEst = img.naturalWidth * img.naturalHeight * 3;
      console.debug(
        `[ImageCompress] ${(blob.size / 1024).toFixed(0)}KB (est. ${(originalEst / 1024).toFixed(0)}KB raw)`,
      );

      onConfirm(blob);
    } catch {
      toast.error("Photo crop fail hua, dobara try karein");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ZoomIn size={18} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground text-base">
              Photo Crop Karein
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close crop modal"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-4 bg-muted/40">
          <div
            className="overflow-hidden rounded-xl"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.2s",
            }}
          >
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              aspect={1}
              circularCrop
              keepSelection
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-72 object-contain mx-auto block"
                style={{ display: "block" }}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="px-5 py-3 bg-muted/20 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium w-12">
              Zoom
            </span>
            <input
              type="range"
              min={0.8}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary cursor-pointer h-2 rounded-full"
              aria-label="Zoom slider"
            />
            <span className="text-xs text-muted-foreground font-mono w-10 text-right">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Photo ko drag karke face center karein
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing || !crop}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                <CheckCircle size={14} /> Confirm Crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ProviderSubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(
    null,
  );
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [freeSubmitting, setFreeSubmitting] = useState(false);

  const { user } = useAuth();
  const { actor } = useActor();
  const { data: config } = useAdminConfig();
  const { data: pricing } = useSubscriptionPricing();
  const { data: cloudinaryConfig } = useCloudinaryConfig();
  const params = useParams() as { category?: string };
  const catName = params.category;

  const storedPlan = user
    ? (localStorage.getItem(`dz_provider_plantype_${user.userId}`) ?? "premium")
    : "premium";
  const isPremiumPlan = storedPlan === "premium";

  const catRowData = useMemo(() => {
    if (!catName) return null;
    try {
      const found = ALL_CATEGORIES.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
      const key = found ? found.name : catName;
      return JSON.parse(localStorage.getItem(`dz_cat_row_${key}`) ?? "null");
    } catch {
      return null;
    }
  }, [catName]);

  const getPlanPrice = (plan: string): string => {
    if (catRowData) {
      if (plan === "oneMonth" && catRowData.m1) return `₹${catRowData.m1}`;
      if (plan === "twoMonths" && catRowData.m2) return `₹${catRowData.m2}`;
      if (plan === "sixMonths" && catRowData.m6) return `₹${catRowData.m6}`;
      if (plan === "twelveMonths" && catRowData.m12)
        return `₹${catRowData.m12}`;
    }
    if (!pricing) return "---";
    if (plan === "oneMonth") return `₹${pricing.oneMonthPrice}`;
    if (plan === "twoMonths") return `₹${pricing.oneMonthPrice}`;
    if (plan === "sixMonths") return `₹${pricing.threeMonthPrice}`;
    if (plan === "twelveMonths") return `₹${pricing.twelveMonthPrice}`;
    return "---";
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    setScreenshotFile(file);
    setCroppedBlob(null);
  };

  const handleCropConfirm = (blob: Blob) => {
    // Revoke previous preview URL to avoid memory leaks
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    const previewUrl = URL.createObjectURL(blob);
    setCroppedBlob(blob);
    setCroppedPreviewUrl(previewUrl);
    setShowCropModal(false);
    setCropSrc(null);
    toast.success("Photo crop ho gayi! ✅");
  };

  const handleUpload = async () => {
    if (!actor || !user || !selectedPlan) return;
    const fileToUpload = croppedBlob ?? screenshotFile;
    if (!fileToUpload) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      toast.loading("Uploading to cloud...", { id: "upload-progress" });
      // Upload to Cloudinary
      const config_cld = cloudinaryConfig ?? {
        cloudName:
          localStorage.getItem("dz_cloudinary_cloud_name") ?? "dquyiiu7o",
        apiKey:
          localStorage.getItem("dz_cloudinary_api_key") ?? "199372638334688",
      };
      const secureUrl = await uploadToCloudinary(fileToUpload, config_cld, {
        folder: "digital-zindagi/payment-screenshots",
      });
      setUploadProgress(100);
      toast.dismiss("upload-progress");

      await actor.uploadPaymentScreenshot(user.userId, secureUrl);

      try {
        await actor.approveProvider(
          user.userId,
          planToBackendEnum(selectedPlan),
        );
      } catch {
        // Auto-approve failed silently — admin can still manually approve
      }

      setSubmitted(true);
      toast.success("Profile live ho gayi! Ab aap listed hain.");
    } catch (err: unknown) {
      toast.dismiss("upload-progress");
      const msg = err instanceof Error ? err.message : "Upload fail ho gaya";
      if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch")
      ) {
        toast.error("Connection error. Please check your internet.");
      } else {
        toast.error("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFreeSubmit = async () => {
    if (!actor || !user || !selectedPlan) return;
    setFreeSubmitting(true);
    try {
      await actor.approveProvider(user.userId, SubscriptionPlan.oneMonth);
      setSubmitted(true);
      toast.success("Profile live ho gayi!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit fail ho gaya";
      toast.error(msg);
    } finally {
      setFreeSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full"
          data-ocid="subscribe.success_state"
        >
          <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
          <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
            {isPremiumPlan
              ? "Payment Ho Gayi! Profile Live Ho Gayi!"
              : "Profile Live Ho Gayi!"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isPremiumPlan
              ? "Aapka payment ho gaya aur aapki profile automatically approve ho gayi hai. Ab aap live hain!"
              : "Aapki profile approve ho gayi hai. Ab aap listed hain!"}
          </p>
          <Link
            to="/provider/dashboard"
            data-ocid="subscribe.primary_button"
            className="inline-block bg-primary text-primary-foreground font-bold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Dashboard Dekhein
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Crop Modal */}
      {showCropModal && cropSrc && (
        <PhotoCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false);
            setCropSrc(null);
          }}
        />
      )}

      <div className="min-h-screen bg-background">
        <div className="bg-emerald-header text-white px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/"
              className="text-white/70 text-sm hover:text-white mb-2 block"
            >
              &larr; Home
            </Link>
            <h1 className="font-heading font-bold text-2xl">
              Abhi Subscribe Karein
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Plan chunein aur apna digital shop shuru karein
            </p>
            {catName && (
              <p className="text-white/60 text-xs mt-1">Category: {catName}</p>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1">
              {isPremiumPlan ? (
                <>
                  <Crown size={13} className="text-yellow-300" />
                  <span className="text-xs text-white font-medium">
                    Premium Plan (Ads free hoga)
                  </span>
                </>
              ) : (
                <span className="text-xs text-white/80">
                  Free Plan selected hai
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {!selectedPlan ? (
            <>
              <h2 className="font-heading font-bold text-xl text-foreground mb-2">
                Plan Select Karein
              </h2>
              {catRowData && (
                <p className="text-xs text-muted-foreground mb-6">
                  ℹ️ Is category ke liye special pricing set hai (Category
                  Manager se).
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {["oneMonth", "twoMonths", "sixMonths", "twelveMonths"].map(
                  (plan, i) => (
                    <motion.div
                      key={plan}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      data-ocid={`subscribe.item.${i + 1}`}
                      className={`bg-white rounded-2xl border-2 shadow-card p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                        plan === "twelveMonths"
                          ? "border-primary relative"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {plan === "twelveMonths" && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                          Best Value ⭐
                        </span>
                      )}
                      <h3 className="font-heading font-bold text-lg text-foreground mb-0.5">
                        {PLAN_LABELS[plan]}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {PLAN_DURATION_HINT[plan]}
                      </p>
                      <div className="text-2xl font-bold text-primary mb-4">
                        {getPlanPrice(plan)}
                      </div>
                      <ul className="space-y-1.5 mb-4">
                        {PLAN_FEATURES[plan].map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <CheckCircle
                              size={12}
                              className="text-green-500 flex-shrink-0"
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        data-ocid={`subscribe.select_button.${i + 1}`}
                        className="mt-auto w-full bg-primary text-primary-foreground font-bold py-2 rounded-xl hover:opacity-90 transition-opacity text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan);
                        }}
                      >
                        Select Karein
                      </button>
                    </motion.div>
                  ),
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg mx-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-sm text-primary hover:underline mb-6 flex items-center gap-1"
              >
                &larr; Plan badlein ({PLAN_LABELS[selectedPlan]})
              </button>

              {isPremiumPlan ? (
                /* === PREMIUM: QR + screenshot upload with crop === */
                <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Crown size={18} className="text-yellow-500" />
                    <h3 className="font-heading font-bold text-lg text-foreground">
                      Payment Details
                    </h3>
                  </div>

                  <div className="bg-accent rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      Admin UPI ID:
                    </p>
                    <p className="font-bold text-foreground text-lg">
                      {config?.upiId ?? "Abhi set nahi hua"}
                    </p>
                  </div>

                  {config?.qrCodeBlobId && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        QR Code se bhi pay kar sakte hain:
                      </p>
                      <img
                        src={config.qrCodeBlobId.getDirectURL()}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain border border-border rounded-xl mx-auto"
                      />
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Pay karna hai:
                    </p>
                    <p className="text-3xl font-bold text-green-700">
                      {getPlanPrice(selectedPlan)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {PLAN_LABELS[selectedPlan]} ke liye
                    </p>
                  </div>

                  {/* Photo Upload with Crop */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Payment Screenshot Upload Karein
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      📸 Photo select karne ke baad Zoom & Crop tool khulega —
                      apna face center karein
                    </p>

                    {/* Preview of cropped image */}
                    {croppedBlob && croppedPreviewUrl && (
                      <div className="mb-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                        <img
                          src={croppedPreviewUrl}
                          alt="Cropped preview"
                          className="w-14 h-14 rounded-lg flex-shrink-0"
                          style={{
                            width: "56px",
                            height: "56px",
                            objectFit: "cover",
                            aspectRatio: "1/1",
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-green-700">
                            ✅ Photo ready hai
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (screenshotFile) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setCropSrc(reader.result as string);
                                  setShowCropModal(true);
                                };
                                reader.readAsDataURL(screenshotFile);
                              }
                            }}
                            className="text-xs text-primary underline mt-0.5"
                          >
                            Dobara crop karein
                          </button>
                        </div>
                      </div>
                    )}

                    <label
                      data-ocid="subscribe.upload_button"
                      className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all"
                    >
                      <Upload
                        size={20}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <div className="text-sm min-w-0">
                        {screenshotFile ? (
                          <span className="text-foreground font-medium truncate block">
                            {screenshotFile.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Screenshot chunein (JPG, PNG)
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(f);
                        }}
                      />
                    </label>
                  </div>

                  {uploading && (
                    <div
                      data-ocid="subscribe.loading_state"
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Upload ho raha hai...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    data-ocid="subscribe.submit_button"
                    onClick={handleUpload}
                    disabled={(!screenshotFile && !croppedBlob) || uploading}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {uploading
                      ? "Upload Ho Raha Hai..."
                      : "Screenshot Upload Karein"}
                  </button>
                </div>
              ) : (
                /* === FREE PLAN: Direct submit === */
                <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Free Plan Confirmation
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-700 font-medium mb-1">
                      📢 Free Plan mein aapki profile par ads dikhenge
                    </p>
                    <p className="text-xs text-orange-600">
                      Kabhi bhi Premium upgrade kar sakte hain.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Koi payment nahi, turant profile live hogi
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="subscribe.submit_button"
                    onClick={handleFreeSubmit}
                    disabled={freeSubmitting}
                    className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {freeSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {freeSubmitting ? "Processing..." : "Submit for Approval"}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
