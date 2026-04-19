import {
  Briefcase,
  CheckCircle,
  CheckSquare,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  QrCode,
  Square,
  Tv2,
  User2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

function getSignupErrorMessage(err: unknown): string {
  const msg =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lowerMsg = msg.toLowerCase();

  if (
    lowerMsg.includes("already exists") ||
    lowerMsg.includes("duplicate") ||
    lowerMsg.includes("already registered") ||
    lowerMsg.includes("already_registered")
  ) {
    return "यह email/number पहले से registered है";
  }
  if (lowerMsg.includes("invalid") || lowerMsg.includes("missing")) {
    return "कृपया सभी fields सही से भरें";
  }
  if (
    lowerMsg.includes("ic0.trap") ||
    lowerMsg.includes("reject code") ||
    lowerMsg.includes("canister trapped") ||
    lowerMsg.includes("method not found") ||
    lowerMsg.includes("canister") ||
    lowerMsg.includes("actor")
  ) {
    return "Service temporarily unavailable. Please try again.";
  }
  if (
    lowerMsg.includes("agenterror") ||
    lowerMsg.includes("fetch") ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("connect") ||
    lowerMsg.includes("timeout")
  ) {
    return "Backend connect नहीं हो पा रहा, कृपया दोबारा try करें";
  }
  return "Registration में problem आई, कृपया दोबारा try करें";
}

import { useEffect } from "react";
import { UserRole } from "../backend";
import { ALL_CATEGORIES } from "../components/CategoryGrid";
import { SUPER_ADMIN_EMAIL, hashPassword } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { useAdminConfig, useCategories } from "../hooks/useQueries";
import { Link, useNavigate } from "../lib/router";

// Typed interface for the registerUser canister call
interface ActorWithRegister {
  registerUser(
    name: string,
    mobile: string,
    passwordHash: string,
    role: UserRole,
    securityQuestion: string,
    securityAnswer: string,
  ): Promise<void>;
}

const SECURITY_QUESTIONS = [
  "Best Friend Ka Naam",
  "Maa Ka Naam",
  "Pet Ka Naam",
  "Favourite City",
  "School Ka Naam",
];

// Default categories as fallback when canister is loading
const DEFAULT_CATEGORY_LIST = ALL_CATEGORIES.map((c) => ({
  name: c.name,
  emoji: c.emoji,
}));

// Timeout wrapper for backend calls (30 seconds)
function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("timeout: backend connect नहीं हो पा रहा")),
        ms,
      ),
    ),
  ]);
}

export default function SignupPage() {
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [secQ, setSecQ] = useState(SECURITY_QUESTIONS[0]);
  const [secA, setSecA] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shopLat, setShopLat] = useState<number | null>(null);
  const [shopLng, setShopLng] = useState<number | null>(null);
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Revenue wall state
  const [showAdsConsentModal, setShowAdsConsentModal] = useState(false);
  const [adsConsentChecked, setAdsConsentChecked] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [_pendingPlanType, setPendingPlanType] = useState<
    "pending_premium" | "free" | null
  >(null);

  const handleDetectShopLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Aapka browser GPS support nahi karta");
      return;
    }
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShopLat(pos.coords.latitude);
        setShopLng(pos.coords.longitude);
        setDetectingGPS(false);
        toast.success(
          `✅ Location detect ho gayi! (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
        );
      },
      (err) => {
        setDetectingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Location permission den zaroori hai — browser settings check karein",
          );
        } else {
          toast.error("GPS se location nahi mili, dobara try karein");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const { data: adminConfig } = useAdminConfig();
  const { actor, isFetching } = useActor();
  const navigate = useNavigate();

  // Auto-redirect to login 3 seconds after successful registration
  useEffect(() => {
    if (!registrationSuccess) return;
    const timer = setTimeout(() => {
      try {
        navigate("/login");
      } catch {
        /* ignore navigation errors */
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [registrationSuccess, navigate]);

  // ── Dynamic categories from canister (polls every 2s) ──────────────────
  const { data: canisterCategories, isLoading: catsLoading } = useCategories();
  const categories: { name: string; emoji: string }[] = (() => {
    if (canisterCategories && canisterCategories.length > 0) {
      return canisterCategories.map((c) => ({ name: c.name, emoji: c.emoji }));
    }
    try {
      const extra = JSON.parse(
        localStorage.getItem("dz_approved_categories") ?? "[]",
      ) as { name: string; icon: string }[];
      const defaultNames = new Set(
        DEFAULT_CATEGORY_LIST.map((c) => c.name.toLowerCase()),
      );
      const merged = [
        ...DEFAULT_CATEGORY_LIST,
        ...extra
          .filter((c) => !defaultNames.has(c.name.toLowerCase()))
          .map((c) => ({ name: c.name, emoji: c.icon ?? "🏪" })),
      ];
      return merged;
    } catch {
      return DEFAULT_CATEGORY_LIST;
    }
  })();

  // Welcome message from admin settings
  const welcomeMessage =
    localStorage.getItem("dz_welcome_message") ??
    "Digital Zindagi family mein shamil ho";

  // Admin QR toggle
  const showRegistrationQR = (() => {
    try {
      const val = localStorage.getItem("dz_show_registration_qr");
      return val === null ? true : val === "true";
    } catch {
      return true;
    }
  })();

  const validate = (): boolean => {
    if (!name.trim()) {
      toast.error("Naam bharna zaroori hai");
      return false;
    }
    if (!mobile.trim()) {
      toast.error("Mobile number bharna zaroori hai");
      return false;
    }
    if (!password) {
      toast.error("Password bharna zaroori hai");
      return false;
    }
    if (password !== confirmPwd) {
      toast.error("Passwords match nahi kar rahe");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return false;
    }
    if (!secA.trim()) {
      toast.error("Security answer bharna zaroori hai");
      return false;
    }
    if (role === "provider" && !category) {
      toast.error("Provider ke liye category select karna zaroori hai");
      return false;
    }
    return true;
  };

  const handleProviderSubmit = (planType: "pending_premium" | "free") => {
    if (!validate()) return;
    setPendingPlanType(planType);
    if (planType === "free") {
      setAdsConsentChecked(false);
      setShowAdsConsentModal(true);
    } else {
      setShowSubscriptionModal(true);
    }
  };

  // FIX: Backend call is now BLOCKING — success only after canister confirms
  const completeProviderRegistration = async (
    planType: "pending_premium" | "free",
  ) => {
    if (!actor) {
      toast.error(
        isFetching
          ? "Backend load ho raha hai, ek moment wait karein..."
          : "Backend connect nahi ho pa raha, refresh karein",
      );
      return;
    }

    setSubmitting(true);
    setShowAdsConsentModal(false);
    setShowSubscriptionModal(false);

    try {
      // Hash password before sending to backend
      const passwordHash = await hashPassword(password);

      // BLOCKING canister call — await confirmation before proceeding
      await withTimeout(
        (actor as unknown as ActorWithRegister).registerUser(
          name.trim(),
          mobile.trim(),
          passwordHash,
          UserRole.provider,
          secQ,
          secA.trim(),
        ),
      );

      // Backend confirmed — now show success
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      const msg = getSignupErrorMessage(err);
      // Check for "already exists" — treat as success for provider (they can still proceed)
      const rawMsg =
        (err as Error)?.message ?? (typeof err === "string" ? err : "");
      const isAlreadyExists =
        rawMsg.toLowerCase().includes("already") ||
        rawMsg.toLowerCase().includes("duplicate") ||
        rawMsg.toLowerCase().includes("registered");

      if (isAlreadyExists && planType === "pending_premium") {
        // Provider already registered — still show pending approval screen
        setRegistrationSuccess(true);
      } else if (isAlreadyExists) {
        toast.error("यह mobile number पहले से registered है। Login करें।");
      } else {
        toast.error(msg);
        // Stay on form — no navigation, no green screen
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !password || !secA.trim()) {
      toast.error("Sab fields bharna zaroori hai");
      return;
    }
    if (password !== confirmPwd) {
      toast.error("Passwords match nahi kar rahe");
      return;
    }
    if (password.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return;
    }

    const isSuperAdmin =
      email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (isSuperAdmin) {
      navigate("/admin");
      return;
    }

    if (!actor) {
      toast.error(
        isFetching
          ? "Backend load ho raha hai, ek moment wait karein..."
          : "Backend connect nahi ho pa raha, refresh karein",
      );
      return;
    }

    setSubmitting(true);

    try {
      // Hash password before sending to backend
      const passwordHash = await hashPassword(password);

      // BLOCKING canister call — await confirmation
      await withTimeout(
        (actor as unknown as ActorWithRegister).registerUser(
          name.trim(),
          mobile.trim(),
          passwordHash,
          UserRole.customer,
          secQ,
          secA.trim(),
        ),
      );

      // Backend confirmed — now show success
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      const rawMsg =
        (err as Error)?.message ?? (typeof err === "string" ? err : "");
      const isAlreadyExists =
        rawMsg.toLowerCase().includes("already") ||
        rawMsg.toLowerCase().includes("duplicate") ||
        rawMsg.toLowerCase().includes("registered");

      if (isAlreadyExists) {
        toast.error("यह email/number पहले से registered है। Login करें।");
      } else {
        toast.error(getSignupErrorMessage(err));
        // Stay on form — no freeze, no green screen
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-hero flex items-center justify-center p-4">
      {/* ── Registration Success Screen ── */}
      {registrationSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
          data-ocid="signup.success_state"
        >
          <div className="bg-emerald-header px-8 py-7 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={36} className="text-white" />
            </div>
            <h1 className="font-heading font-bold text-white text-2xl">
              Registration Submitted!
            </h1>
          </div>
          <div className="px-8 py-8 text-center space-y-5">
            <p className="text-foreground text-base leading-relaxed">
              आपका registration admin के पास approval के लिए पहुंच गया है। Approval के
              बाद आप login कर पाएंगे।
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-800 text-left space-y-1">
              <p className="font-semibold">अगले steps:</p>
              <p>✅ Admin आपकी request review करेंगे</p>
              <p>✅ Approval मिलने पर login कर सकते हैं</p>
              <p>✅ Status के लिए admin से contact करें</p>
            </div>
            <Link
              to="/login"
              data-ocid="signup.login_button"
              className="block w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-center"
              onClick={() => navigate("/login")}
            >
              Login Page पर जाएं
            </Link>
            <p className="text-xs text-muted-foreground text-center">
              3 seconds में automatically redirect होगा...
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-emerald-header px-8 py-7">
            <Link
              to="/"
              className="text-white/70 text-sm hover:text-white mb-3 block"
            >
              &larr; Wapas Jao
            </Link>
            <h1 className="font-heading font-bold text-white text-3xl">
              Account Banao
            </h1>
            <p className="text-white/70 text-sm mt-1">{welcomeMessage}</p>
          </div>

          <form onSubmit={handleCustomerSubmit} className="px-8 py-7 space-y-5">
            {/* Role selector */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Aap kaun hain?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-ocid="signup.toggle"
                  onClick={() => setRole("customer")}
                  className={`flex items-center gap-2 justify-center p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    role === "customer"
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <User2 size={16} /> Customer
                </button>
                <button
                  type="button"
                  data-ocid="signup.toggle"
                  onClick={() => setRole("provider")}
                  className={`flex items-center gap-2 justify-center p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    role === "provider"
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Briefcase size={16} /> Provider
                </button>
              </div>
            </div>

            {/* Category dropdown — only for providers */}
            {role === "provider" && (
              <div>
                <label
                  className="block text-sm font-medium text-foreground mb-1.5"
                  htmlFor="service-category"
                >
                  Service Category <span className="text-destructive">*</span>
                </label>
                <select
                  id="service-category"
                  data-ocid="signup.select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                  required
                  disabled={catsLoading && categories.length === 0}
                >
                  <option value="" disabled>
                    {catsLoading && categories.length === 0
                      ? "Categories load ho rahi hain..."
                      : "Category chunein..."}
                  </option>
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="name"
              >
                Pura Naam
              </label>
              <input
                id="name"
                data-ocid="signup.input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apna naam daalein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="name"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="mobile"
              >
                Mobile Number
              </label>
              <input
                id="mobile"
                data-ocid="signup.input"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10 digit mobile number"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="tel"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="signup-email"
              >
                Email (Optional)
              </label>
              <input
                id="signup-email"
                data-ocid="signup.input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address (optional)"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium text-foreground mb-1.5"
                  htmlFor="pwd"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="pwd"
                    data-ocid="signup.input"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-foreground mb-1.5"
                  htmlFor="cpwd"
                >
                  Confirm Password
                </label>
                <input
                  id="cpwd"
                  data-ocid="signup.input"
                  type={showPwd ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Dobara daalein"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="secq"
              >
                Security Question
              </label>
              <select
                id="secq"
                data-ocid="signup.select"
                value={secQ}
                onChange={(e) => setSecQ(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="seca"
              >
                Security Answer
              </label>
              <input
                id="seca"
                data-ocid="signup.input"
                type="text"
                value={secA}
                onChange={(e) => setSecA(e.target.value)}
                placeholder="Jawab likhein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Referral Code */}
            <div>
              <label
                className="block text-sm font-medium text-foreground mb-1.5"
                htmlFor="referral-code"
              >
                Referral Code{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <input
                id="referral-code"
                data-ocid="signup.referral_input"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Kisi ne code diya ho to yahan daalein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoComplete="off"
              />
            </div>

            {/* Registration QR from admin config */}
            {showRegistrationQR && adminConfig?.qrCodeBlobId && (
              <div className="bg-accent rounded-2xl p-4 text-center">
                <p className="text-sm font-medium text-foreground mb-1">
                  <QrCode
                    size={14}
                    className="inline mr-1.5 -mt-0.5 text-primary"
                  />
                  Subscription Payment QR
                </p>
                <img
                  src={adminConfig.qrCodeBlobId.getDirectURL()}
                  alt="Admin UPI QR"
                  className="w-32 h-32 mx-auto object-contain"
                />
                {adminConfig.upiId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    UPI: {adminConfig.upiId}
                  </p>
                )}
              </div>
            )}

            {/* GPS Shop Location Button — only for providers */}
            {role === "provider" && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <LocateFixed size={15} /> Apni Dukaan Ki Location Set Karein
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  Apni dukaan par khade hokar neeche ka button dabayein — GPS se
                  exact location save ho jaayegi.
                </p>
                <button
                  type="button"
                  data-ocid="signup.location_button"
                  onClick={handleDetectShopLocation}
                  disabled={detectingGPS}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  <LocateFixed size={15} />
                  {detectingGPS
                    ? "GPS se Location Dhundh Raha Hai..."
                    : "Detect My Shop Location"}
                </button>
                {shopLat !== null && shopLng !== null && (
                  <p className="text-xs text-green-700 font-semibold mt-2 text-center">
                    ✅ Location Saved: {shopLat.toFixed(5)},{" "}
                    {shopLng.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {/* Submit buttons — two for provider, one for customer */}
            {role === "provider" ? (
              <div>
                <p className="text-xs text-center text-muted-foreground mb-3 font-medium">
                  Account register karke apna plan chunein:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Subscription Lege — Premium */}
                  <button
                    type="button"
                    data-ocid="signup.primary_button"
                    disabled={submitting}
                    onClick={() => handleProviderSubmit("pending_premium")}
                    className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                  >
                    {submitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Crown size={15} />
                    )}
                    {submitting
                      ? "Register Ho Raha Hai..."
                      : "Subscription Lege"}
                  </button>

                  {/* Ads Dekhe — Free */}
                  <button
                    type="button"
                    data-ocid="signup.secondary_button"
                    disabled={submitting}
                    onClick={() => handleProviderSubmit("free")}
                    className="w-full bg-slate-100 text-slate-700 border border-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
                  >
                    {submitting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Tv2 size={15} />
                    )}
                    {submitting ? "..." : "Ads Dekhe"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <p className="text-xs text-center text-emerald-600 font-medium">
                    👑 Premium — No Ads
                  </p>
                  <p className="text-xs text-center text-slate-500">
                    📺 Free — Ads Chalenge
                  </p>
                </div>

                {/* Loading indicator */}
                {submitting && (
                  <div
                    data-ocid="signup.loading_state"
                    className="mt-3 flex items-center justify-center gap-2 text-sm text-primary font-medium"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Backend mein register ho raha hai, please wait...
                  </div>
                )}
              </div>
            ) : (
              <button
                type="submit"
                data-ocid="signup.submit_button"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Account Ban Raha Hai..." : "Account Banao"}
              </button>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Pehle se account hai?{" "}
              <Link
                to="/login"
                className="text-primary font-semibold hover:underline"
              >
                Login Karein
              </Link>
            </p>
          </form>
        </motion.div>
      )}

      {/* ADS CONSENT MODAL — Revenue Wall */}
      {showAdsConsentModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdsConsentModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowAdsConsentModal(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-slate-700 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">
                  📺 Ads Plan — Shart Sunein
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  Free listing ke liye zaruri hai
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdsConsentModal(false)}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-2">Ads Plan ke niyam:</p>
                <ul className="space-y-1.5 list-none">
                  <li>• Aapki profile par Digital Zindagi ke ads dikhenge</li>
                  <li>• Aap ads band nahi kar sakte</li>
                  <li>• Kabhi bhi paid plan mein upgrade kar sakte hain</li>
                  <li>• Admin ads ON/OFF kar sakta hai</li>
                </ul>
              </div>
              <div className="flex items-start gap-3 cursor-pointer">
                <button
                  type="button"
                  className="mt-0.5 flex-shrink-0"
                  onClick={() => setAdsConsentChecked((v) => !v)}
                >
                  {adsConsentChecked ? (
                    <CheckSquare size={20} className="text-primary" />
                  ) : (
                    <Square size={20} className="text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm text-foreground">
                  Main samjhta/samajhti hoon ki meri profile par ads dikhenge
                  aur main isko swikar karta/karti hoon.
                </span>
              </div>
              <button
                type="button"
                disabled={!adsConsentChecked || submitting}
                onClick={() => {
                  if (!adsConsentChecked) {
                    toast.error("Ads policy accept karna zaroori hai");
                    return;
                  }
                  completeProviderRegistration("free");
                }}
                className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 text-sm flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting
                  ? "Register Ho Raha Hai..."
                  : "Swikar Karein aur Register Ho"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdsConsentModal(false)}
                className="w-full text-muted-foreground text-sm py-2 hover:underline"
              >
                Wapas Jao
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SUBSCRIPTION PAYMENT MODAL — Revenue Wall */}
      {showSubscriptionModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubscriptionModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowSubscriptionModal(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-emerald-header text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">👑 Subscription Payment</h2>
                <p className="text-white/70 text-xs mt-0.5">
                  Registration complete karne ke liye
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="font-semibold text-emerald-800 text-sm mb-2">
                  Payment Process:
                </p>
                <ol className="space-y-2 text-sm text-emerald-700 list-none">
                  <li>1. Neeche diya QR ya UPI se payment karein</li>
                  <li>2. "Confirm Payment" dabayein</li>
                  <li>3. Aapka account pending mein jayega</li>
                  <li>4. Admin screenshot verify kar ke approve karega</li>
                </ol>
              </div>
              {adminConfig?.qrCodeBlobId && (
                <div className="text-center">
                  <img
                    src={adminConfig.qrCodeBlobId.getDirectURL()}
                    alt="UPI QR Code"
                    className="w-36 h-36 mx-auto object-contain border border-gray-200 rounded-xl"
                  />
                  {adminConfig.upiId && (
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      UPI: {adminConfig.upiId}
                    </p>
                  )}
                </div>
              )}
              {!adminConfig?.qrCodeBlobId && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Admin se UPI/QR code lein aur payment karein
                  </p>
                  <p className="text-xs text-primary font-semibold mt-1">
                    Helpline: Admin se contact karein
                  </p>
                </div>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => completeProviderRegistration("pending_premium")}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting
                  ? "Register Ho Raha Hai..."
                  : "✅ Payment Ho Gayi — Continue Karein"}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                Payment screenshot agle step mein upload karein
              </p>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full text-muted-foreground text-sm py-2 hover:underline"
              >
                Wapas Jao
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
