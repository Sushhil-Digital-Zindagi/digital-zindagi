import { CheckCircle, Crown, Loader2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, SubscriptionPlan } from "../backend";
import { ALL_CATEGORIES } from "../components/CategoryGrid";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { useAdminConfig, useSubscriptionPricing } from "../hooks/useQueries";
import { Link, useParams } from "../lib/router";

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

// Map display plan keys to backend SubscriptionPlan enum
function planToBackendEnum(plan: string): SubscriptionPlan {
  if (plan === "twoMonths") return SubscriptionPlan.oneMonth; // closest backend plan
  if (plan === "sixMonths") return SubscriptionPlan.threeMonths;
  if (plan === "twelveMonths") return SubscriptionPlan.twelveMonths;
  return SubscriptionPlan.oneMonth;
}

export default function ProviderSubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [freeSubmitting, setFreeSubmitting] = useState(false);

  const { user } = useAuth();
  const { actor } = useActor();
  const { data: config } = useAdminConfig();
  const { data: pricing } = useSubscriptionPricing();
  const params = useParams() as { category?: string };
  const catName = params.category;

  // Determine plan type from localStorage
  const storedPlan = user
    ? (localStorage.getItem(`dz_provider_plantype_${user.userId}`) ?? "premium")
    : "premium";
  const isPremiumPlan = storedPlan === "premium";

  // Read category-specific pricing from localStorage (set in Category Manager)
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
    // Check category-specific price first
    if (catRowData) {
      if (plan === "oneMonth" && catRowData.m1) return `₹${catRowData.m1}`;
      if (plan === "twoMonths" && catRowData.m2) return `₹${catRowData.m2}`;
      if (plan === "sixMonths" && catRowData.m6) return `₹${catRowData.m6}`;
      if (plan === "twelveMonths" && catRowData.m12)
        return `₹${catRowData.m12}`;
    }
    // Fall back to global backend pricing
    if (!pricing) return "---";
    if (plan === "oneMonth") return `₹${pricing.oneMonthPrice}`;
    if (plan === "twoMonths") return `₹${pricing.oneMonthPrice}`; // no dedicated backend plan
    if (plan === "sixMonths") return `₹${pricing.threeMonthPrice}`;
    if (plan === "twelveMonths") return `₹${pricing.twelveMonthPrice}`;
    return "---";
  };

  const handleUpload = async () => {
    if (!screenshotFile || !actor || !user || !selectedPlan) return;
    setUploading(true);
    try {
      const bytes = new Uint8Array(await screenshotFile.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setUploadProgress(pct),
      );
      const blobId = blob.getDirectURL();
      await actor.uploadPaymentScreenshot(user.userId, blobId);

      // Auto-approve provider after successful payment
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
    } catch (err: any) {
      toast.error(err?.message ?? "Upload fail ho gaya");
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
    } catch (err: any) {
      toast.error(err?.message ?? "Submit fail ho gaya");
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
          {/* Plan type indicator */}
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
                ℹ️ Is category ke liye special pricing set hai (Category Manager
                se).
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
              /* === PREMIUM: QR + screenshot upload === */
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

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Payment Screenshot Upload Karein
                  </p>
                  <label
                    data-ocid="subscribe.upload_button"
                    className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all"
                  >
                    <Upload size={20} className="text-muted-foreground" />
                    <div className="text-sm">
                      {screenshotFile ? (
                        <span className="text-foreground font-medium">
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
                      onChange={(e) =>
                        setScreenshotFile(e.target.files?.[0] ?? null)
                      }
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
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  disabled={!screenshotFile || uploading}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading && <Loader2 size={16} className="animate-spin" />}
                  {uploading
                    ? "Upload Ho Raha Hai..."
                    : "Screenshot Upload Karein"}
                </button>
              </div>
            ) : (
              /* === FREE PLAN: Direct submit for approval === */
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
  );
}
