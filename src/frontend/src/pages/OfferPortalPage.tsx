/**
 * Digital Zindagi Offer Portal
 * Isolated earning portal with its own login/signup and ID system.
 * All data is sourced from the backend actor — no localStorage primary storage.
 *
 * FIXES vs prior version:
 * - No "Actor not available" errors — shows friendly loading/wait messages
 * - Signup works in one step (register → auto-login, no race condition)
 * - Offer Control Center saves API key correctly via useUpdateOfferPortalConfig
 * - Portal config fetch failure defaults to isEnabled:true (non-admin users)
 * - localStorage session with 7-day rolling expiry
 */
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  LogOut,
  Save,
  Search,
  Settings,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ContentLockerOverlay from "../components/ContentLockerOverlay";
import { useOfferAuth } from "../contexts/OfferAuthContext";
import { useActor } from "../hooks/useActor";
import {
  getWarmupStatusMessage,
  useAdminListAllWithdrawals,
  useAdminListOfferUsers,
  useAdminListPendingWithdrawals,
  useAdminResolveWithdrawal,
  useLoginOfferUser,
  useMyOfferTransactions,
  useMyOfferWithdrawals,
  useOfferEarningsSummary,
  useOfferPortalConfig,
  usePrewarmCanister,
  useRegisterOfferUser,
  useRequestOfferPasswordReset,
  useRequestOfferWithdrawal,
  useResetOfferPassword,
  useUpdateOfferPortalConfig,
} from "../hooks/useOfferQueries";
import { useContentLockerConfig } from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type { OfferTransaction, OfferWithdrawal } from "../types/offerTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupees(amount: bigint): string {
  return `₹${(Number(amount) / 100).toFixed(2)}`;
}

/** Convert any backend error to a clean user-friendly message */
function getOfferErrorMessage(
  err: unknown,
  defaultMsg = "Something went wrong, please try again",
): string {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();

  // ic0.trap / Reject code 5 = wrong password in ICP canister
  if (
    lower.includes("ic0.trap") ||
    lower.includes("reject code: 5") ||
    lower.includes("reject code 5") ||
    lower.includes("canister trapped") ||
    lower.includes("trapped explicitly")
  ) {
    return "Incorrect password, please try again";
  }

  // Canister ID in message (ends with -cai)
  if (/-[a-z0-9]+-cai/i.test(raw)) {
    return "Connection error, please try again";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Backend से connect नहीं हो पा रहा — थोड़ा wait करें";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Connection timeout — please try again";
  }

  // Already-registered is detected in caller — but sanitize here too
  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("registered")
  ) {
    return "User already registered — Login karein";
  }

  // Anything with raw canister/actor jargon
  if (
    lower.includes("actor") ||
    lower.includes("canister") ||
    lower.includes("method not found")
  ) {
    return "Service temporarily unavailable. Please try again.";
  }

  return defaultMsg;
}

type View =
  | "landing"
  | "login"
  | "signup"
  | "dashboard"
  | "redeem"
  | "forgotPassword";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 flex flex-col gap-2 ${
        accent
          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-emerald-900"
          : "bg-card border border-border"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          accent ? "bg-white/30" : "bg-emerald-50"
        }`}
      >
        <span className={accent ? "text-emerald-900" : "text-emerald-600"}>
          {icon}
        </span>
      </div>
      <p
        className={`font-extrabold text-xl leading-none ${accent ? "text-emerald-900" : "text-foreground"}`}
      >
        {value}
      </p>
      <p
        className={`text-xs font-medium ${accent ? "text-emerald-800/80" : "text-muted-foreground"}`}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfferPortalPage() {
  const navigate = useNavigate();
  const { currentOfferUser, offerAuthLoading, logout } = useOfferAuth();
  const { isFetching: actorLoading } = useActor();

  // Pre-warm the canister as soon as this page mounts.
  // This fires a lightweight read query immediately so the canister wakes up
  // BEFORE the user fills out the registration form and clicks Register.
  usePrewarmCanister();

  // Content locker — fail-open if loading/errored
  const { data: lockerConfig } = useContentLockerConfig();

  const [view, setView] = useState<View>(() =>
    currentOfferUser ? "dashboard" : "landing",
  );

  const { data: config, isLoading: configLoading } = useOfferPortalConfig();

  const handleLogout = () => {
    logout();
    setView("landing");
    toast.success("Logout successful");
  };

  // Show spinner while actor is initializing OR session is restoring
  if (offerAuthLoading || (actorLoading && configLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #064e3b, #065f46)" }}
        >
          <span className="text-3xl" aria-hidden>
            🚀
          </span>
        </div>
        <p className="font-heading font-bold text-foreground text-base">
          Digital Zindagi Offer Portal
        </p>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Portal disabled by admin — show clean "Coming Soon" card, NOT a technical error
  if (config && !config.isEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center gap-4">
        <span className="text-5xl">🔒</span>
        <h2 className="font-heading font-bold text-xl text-foreground">
          Offer Portal Abhi Unavailable Hai
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Admin ne filhaal is portal ko band kiya hua hai. Baad mein dobara try
          karein.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-2 flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          <ArrowLeft size={15} /> Wapas Jao
        </button>
      </div>
    );
  }

  return (
    <ContentLockerOverlay featureName="Offer Portal" config={lockerConfig}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top bar */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border/30 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
            Home
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🚀
            </span>
            <span className="font-heading font-bold text-white text-base">
              DZ Offer Portal
            </span>
          </div>
          {currentOfferUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium"
              aria-label="Logout"
            >
              <LogOut size={14} /> Logout
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        <AnimatePresence mode="wait">
          {view === "landing" && (
            <LandingView
              key="landing"
              onLogin={() => setView("login")}
              onSignup={() => setView("signup")}
            />
          )}
          {view === "login" && (
            <LoginView
              key="login"
              onSuccess={() => setView("dashboard")}
              onSignup={() => setView("signup")}
              onBack={() => setView("landing")}
              onForgotPassword={() => setView("forgotPassword")}
            />
          )}
          {view === "signup" && (
            <SignupView
              key="signup"
              onSuccess={() => setView("dashboard")}
              onLogin={() => setView("login")}
              onBack={() => setView("landing")}
            />
          )}
          {view === "forgotPassword" && (
            <ForgotPasswordView
              key="forgotPassword"
              onBack={() => setView("login")}
              onSuccess={() => setView("login")}
            />
          )}
          {view === "dashboard" && currentOfferUser && (
            <DashboardView key="dashboard" onRedeem={() => setView("redeem")} />
          )}
          {view === "redeem" && currentOfferUser && (
            <RedeemView key="redeem" onBack={() => setView("dashboard")} />
          )}
        </AnimatePresence>
      </div>
    </ContentLockerOverlay>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

function LandingView({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  const features = [
    {
      icon: "💰",
      title: "60% Profit Share",
      desc: "Har conversion ka 60% seedha aapke wallet mein",
    },
    {
      icon: "👥",
      title: "1% Referral Bonus",
      desc: "Dost ko refer karo aur unki kamai ka 1% paao",
    },
    {
      icon: "📱",
      title: "UPI Withdrawal",
      desc: "Kamaai sidha aapke UPI account mein",
    },
    {
      icon: "🔒",
      title: "Secure & Verified",
      desc: "Admin-approved payout system",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col"
    >
      {/* Hero */}
      <div
        className="px-6 py-12 text-center flex flex-col items-center gap-4"
        style={{
          background:
            "linear-gradient(180deg, #064e3b 0%, #065f46 60%, #f9fafb 100%)",
        }}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl"
        >
          <span className="text-4xl" aria-hidden>
            🚀
          </span>
        </motion.div>
        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-heading font-extrabold text-white text-3xl leading-tight"
        >
          Digital Zindagi
          <br />
          <span className="text-amber-300">Offer Portal</span>
        </motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="text-white/75 text-base max-w-xs leading-relaxed"
        >
          Ghar baithe kamaao! Har conversion par{" "}
          <strong className="text-amber-300">60%</strong> profit seedha aapke
          wallet mein.
        </motion.p>
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3 mt-2 w-full max-w-xs"
        >
          <button
            type="button"
            data-ocid="offer_portal.signup_button"
            onClick={onSignup}
            className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-emerald-900 font-extrabold py-3.5 rounded-xl shadow-lg hover:from-amber-500 hover:to-yellow-600 transition-all text-sm"
          >
            Join Free
          </button>
          <button
            type="button"
            data-ocid="offer_portal.login_button"
            onClick={onLogin}
            className="flex-1 bg-white/15 text-white font-bold py-3.5 rounded-xl hover:bg-white/25 transition-all text-sm border border-white/20"
          >
            Login
          </button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-4 py-8 bg-background flex-1">
        <h2 className="font-heading font-bold text-center text-foreground text-lg mb-5">
          Kyun Join Karein?
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4 }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <p className="font-bold text-foreground text-sm">{f.title}</p>
              <p className="text-muted-foreground text-xs leading-snug">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 max-w-md mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5" aria-hidden>
            ℹ️
          </span>
          <p className="text-emerald-800 text-xs leading-relaxed">
            Yeh portal Digital Zindagi ke main account se bilkul alag hai — iska
            apna login, apna ID, aur apna wallet hai.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginView({
  onSuccess,
  onSignup,
  onBack,
  onForgotPassword,
}: {
  onSuccess: () => void;
  onSignup: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const loginMutation = useLoginOfferUser();
  const { isFetching: actorLoading } = useActor();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim()) {
      setErrorMsg("Email daalo");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Password daalo");
      return;
    }
    if (actorLoading) {
      setErrorMsg("Portal abhi load ho raha hai, ek second wait karein...");
      return;
    }
    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          toast.success("Welcome back! 🎉");
          onSuccess();
        },
        onError: (err) => {
          setErrorMsg(getOfferErrorMessage(err, "Email ya password galat hai"));
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl" aria-hidden>
            🚀
          </span>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Offer Portal Login
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Apna account access karein
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="op-email"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Email
          </label>
          <input
            id="op-email"
            data-ocid="offer_portal.input"
            type="email"
            placeholder="aapka@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-password"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Password
          </label>
          <input
            id="op-password"
            data-ocid="offer_portal.input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              data-ocid="offer_portal.forgot_password_link"
              onClick={onForgotPassword}
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>
        </div>
        {errorMsg && (
          <p
            data-ocid="offer_portal.error_msg"
            className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {errorMsg}
          </p>
        )}
        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={loginMutation.isPending || actorLoading}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md flex items-center justify-center gap-2"
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Checking...
            </>
          ) : actorLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Loading...
            </>
          ) : (
            "Login Karein →"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Account nahi hai?{" "}
        <button
          type="button"
          data-ocid="offer_portal.link"
          onClick={onSignup}
          className="text-primary font-semibold hover:underline"
        >
          Join Free
        </button>
      </p>
    </motion.div>
  );
}

// ─── Signup ───────────────────────────────────────────────────────────────────

function SignupView({
  onSuccess,
  onLogin,
  onBack,
}: {
  onSuccess: () => void;
  onLogin: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [referralCode, setReferralCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref") ?? "";
    } catch {
      return "";
    }
  });

  // useRegisterOfferUser handles register + auto-login + waitForActor (90s) + retry
  const registerMutation = useRegisterOfferUser();
  const isSubmitting = registerMutation.isPending;

  // Elapsed time ticker while submitting — drives the progress indicator
  useEffect(() => {
    if (!isSubmitting) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 500);
    return () => clearInterval(id);
  }, [isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // prevent double-submit
    setErrorMsg("");
    setStatusMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg("Email daalo");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMsg("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
      setErrorMsg("Mobile number 10 digits ka hona chahiye (6/7/8/9 se shuru)");
      return;
    }

    // Normalize referral code — empty string means no referral (hook encodes as [] for None)
    const refCodeArg =
      referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : "";

    registerMutation.mutate(
      {
        email: email.trim(),
        password,
        referralCode: refCodeArg,
        onStatusChange: (msg) => setStatusMsg(msg),
      },
      {
        onSuccess: (user) => {
          setStatusMsg("");
          setSuccessMsg(`Account ban gaya! Welcome aboard 🎉 (ID: ${user.id})`);
          setTimeout(() => {
            onSuccess();
          }, 1500);
        },
        onError: (err) => {
          setStatusMsg("");
          const msg =
            err instanceof Error
              ? err.message
              : "Registration nahi ho payi. Dobara try karein.";

          if (msg === "Account ban gaya! Abhi login karein.") {
            setSuccessMsg("Account ban gaya! ✅ Ab login karein.");
            toast.success("Account ban gaya! Login karein. 🎉");
            setTimeout(() => {
              onLogin();
            }, 2000);
            return;
          }

          const isAlreadyRegistered =
            msg.toLowerCase().includes("already") ||
            msg.toLowerCase().includes("pehle se registered") ||
            msg.toLowerCase().includes("already registered") ||
            msg.toLowerCase().includes("yeh email already");
          if (isAlreadyRegistered) {
            toast.error("Yeh email already registered hai — Login karein");
            setErrorMsg("Yeh email already registered hai — Login karein");
          } else if (
            msg.toLowerCase().includes("server") ||
            msg.toLowerCase().includes("connect")
          ) {
            setErrorMsg(
              "Server se connect nahi ho pa raha, 1 minute baad try karein",
            );
          } else {
            setErrorMsg(msg);
          }
        },
      },
    );
  };

  // Determine progress percentage (0–100) based on elapsed time
  const progressPct = Math.min(100, (elapsedMs / 90_000) * 100);
  const warmupMsg = isSubmitting ? getWarmupStatusMessage(elapsedMs) : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors disabled:opacity-40"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl" aria-hidden>
            🎯
          </span>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Free mein Join Karein
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Unique DZ Offer ID milega
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center gap-2"
          data-ocid="offer_portal.success_state"
        >
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <p className="text-emerald-800 text-sm font-semibold">{successMsg}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="op-signup-email"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Email *
          </label>
          <input
            id="op-signup-email"
            data-ocid="offer_portal.signup_email_input"
            type="email"
            placeholder="aapka@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background disabled:opacity-60"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-signup-password"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Password * (min 6 chars)
          </label>
          <input
            id="op-signup-password"
            data-ocid="offer_portal.signup_password_input"
            type="password"
            placeholder="Strong password banayein"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background disabled:opacity-60"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label
            htmlFor="op-referral"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Referral Code (Optional)
          </label>
          <input
            id="op-referral"
            data-ocid="offer_portal.signup_referral_input"
            type="text"
            placeholder="Kisi ka referral code hai?"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            disabled={isSubmitting}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background font-mono disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="op-signup-mobile"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Mobile Number{" "}
            <span className="text-muted-foreground font-normal normal-case">
              (OTP recovery ke liye)
            </span>
          </label>
          <input
            id="op-signup-mobile"
            data-ocid="offer_portal.signup_mobile_input"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile (optional)"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            disabled={isSubmitting}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background disabled:opacity-60"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Agar password bhool jaao to OTP is number par aayega
          </p>
        </div>

        {/* Animated warm-up progress indicator */}
        {isSubmitting && (
          <div
            data-ocid="offer_portal.loading_state"
            className="space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Loader2
                size={14}
                className="animate-spin text-emerald-600 flex-shrink-0"
              />
              <span className="text-sm font-medium text-emerald-800">
                {statusMsg || warmupMsg || "Connecting..."}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-1.5 bg-emerald-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </div>
            {elapsedMs > 15_000 && (
              <p className="text-xs text-emerald-700">
                ⏱️ ICP server warm ho raha hai — yeh normal hai, 1-2 minute tak
                wait karein
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div
            data-ocid="offer_portal.error_state"
            className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-2"
          >
            <p>{errorMsg}</p>
            <button
              type="button"
              data-ocid="offer_portal.retry_button"
              onClick={() => {
                setErrorMsg("");
                setStatusMsg("");
              }}
              className="text-xs font-semibold text-red-700 underline"
            >
              Dobara Try Karein
            </button>
          </div>
        )}

        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-emerald-900 font-extrabold py-3.5 rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all disabled:opacity-60 text-sm shadow-md mt-1 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              {statusMsg || warmupMsg || "Creating Account..."}
            </>
          ) : (
            "Join & Earn Now →"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Account hai?{" "}
        <button
          type="button"
          data-ocid="offer_portal.link"
          onClick={onLogin}
          disabled={isSubmitting}
          className="text-primary font-semibold hover:underline disabled:opacity-40"
        >
          Login Karein
        </button>
      </p>
    </motion.div>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

async function sha256hex(pwd: string): Promise<string> {
  const data = new TextEncoder().encode(pwd);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ForgotPasswordView({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSentMsg, setOtpSentMsg] = useState("");

  const requestOtpMutation = useRequestOfferPasswordReset();
  const resetPasswordMutation = useResetOfferPassword();

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim()) {
      setErrorMsg("Email daalo");
      return;
    }
    requestOtpMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setOtpSentMsg(
            "OTP आपके registered mobile पर भेज दिया गया है। अगर SMS नहीं आया, तो Admin से संपर्क करें।",
          );
          setStep(2);
        },
        onError: (err) => {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "OTP bhejne mein problem hua. Dobara try karein.",
          );
        },
      },
    );
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!otp.trim() || otp.length !== 6) {
      setErrorMsg("6-digit OTP daalo");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Naya password kam se kam 6 characters ka hona chahiye");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Dono passwords match nahi karte");
      return;
    }
    const hash = await sha256hex(newPassword);
    resetPasswordMutation.mutate(
      { email: email.trim(), otp: otp.trim(), newPasswordHash: hash },
      {
        onSuccess: () => {
          toast.success(
            "Password reset ho gaya! Ab naye password se login karein. ✅",
          );
          onSuccess();
        },
        onError: (err) => {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Password reset fail hua. Dobara try karein.",
          );
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Login par wapas jao
      </button>

      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl" aria-hidden>
            🔑
          </span>
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Password Bhool Gaye?
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {step === 1
            ? "Apni email daalo — OTP registered mobile par aayega"
            : "OTP aur naya password daalo"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? "bg-emerald-600 text-white shadow-md"
                  : step > s
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 2 && (
              <div
                className={`w-12 h-0.5 rounded-full ${step > s ? "bg-emerald-400" : "bg-border"}`}
              />
            )}
          </div>
        ))}
        <p className="sr-only">
          Step {step} of 2: {step === 1 ? "Request OTP" : "Reset Password"}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label
              htmlFor="fp-email"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Registered Email
            </label>
            <input
              id="fp-email"
              data-ocid="offer_portal.forgot_password_email_input"
              type="email"
              placeholder="aapka@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              autoComplete="email"
              required
            />
          </div>
          {errorMsg && (
            <p
              data-ocid="offer_portal.forgot_password.error_state"
              className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            data-ocid="offer_portal.forgot_password_send_otp_button"
            disabled={requestOtpMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md flex items-center justify-center gap-2"
          >
            {requestOtpMutation.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> OTP bhej raha
                hai...
              </>
            ) : (
              "OTP Bhejo →"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {otpSentMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-lg mt-0.5 flex-shrink-0" aria-hidden>
                📱
              </span>
              <p className="text-emerald-800 text-xs leading-relaxed">
                {otpSentMsg}
              </p>
            </div>
          )}
          <div>
            <label
              htmlFor="fp-otp"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              OTP (6 digits)
            </label>
            <input
              id="fp-otp"
              data-ocid="offer_portal.forgot_password_otp_input"
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background tracking-widest font-mono text-center text-lg"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label
              htmlFor="fp-newpwd"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Naya Password (min 6 chars)
            </label>
            <input
              id="fp-newpwd"
              data-ocid="offer_portal.forgot_password_new_password_input"
              type="password"
              placeholder="Strong password banayein"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              htmlFor="fp-confirmpwd"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Password Confirm Karein
            </label>
            <input
              id="fp-confirmpwd"
              data-ocid="offer_portal.forgot_password_confirm_password_input"
              type="password"
              placeholder="Dobara same password daalo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              autoComplete="new-password"
            />
          </div>
          {errorMsg && (
            <p
              data-ocid="offer_portal.forgot_password.error_state"
              className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            data-ocid="offer_portal.forgot_password_reset_button"
            disabled={resetPasswordMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md flex items-center justify-center gap-2"
          >
            {resetPasswordMutation.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Resetting...
              </>
            ) : (
              "Password Reset Karein →"
            )}
          </button>
          <button
            type="button"
            data-ocid="offer_portal.forgot_password_resend_otp_button"
            onClick={() => {
              setStep(1);
              setOtp("");
              setNewPassword("");
              setConfirmPassword("");
              setErrorMsg("");
              setOtpSentMsg("");
            }}
            className="w-full text-primary text-sm font-medium hover:underline py-2"
          >
            OTP nahi aaya? Dobara request karein
          </button>
        </form>
      )}
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({ onRedeem }: { onRedeem: () => void }) {
  const { currentOfferUser } = useOfferAuth();
  const offerUserId = currentOfferUser?.id ?? undefined;

  const { data: summary, isLoading: summaryLoading } =
    useOfferEarningsSummary(offerUserId);
  const { data: transactions = [] } = useMyOfferTransactions(offerUserId);
  const { data: withdrawals = [] } = useMyOfferWithdrawals(offerUserId);

  const pendingWithdrawalTotal = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0n);

  const referralCode =
    summary?.referralCode ?? currentOfferUser?.referralCode ?? "";
  const referralUrl = `${window.location.origin}/offer-portal?ref=${referralCode}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copy ho gaya! 📋");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleShareReferral = async () => {
    const shareData = {
      title: "Digital Zindagi Offer Portal",
      text: `Ghar baithe kamaao! Mere referral code se join karo: ${referralCode}`,
      url: referralUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        handleCopyReferral();
      }
    } else {
      handleCopyReferral();
    }
  };

  const totalEarnings = summary?.totalEarnings ?? 0n;
  const pendingEarnings = summary?.pendingEarnings ?? 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5"
    >
      {/* Welcome */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
          {(currentOfferUser?.email ?? "U").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-foreground text-lg leading-tight truncate">
            Namaste! 👋
          </h2>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {currentOfferUser?.email}
          </p>
        </div>
        {summaryLoading && (
          <Loader2
            size={15}
            className="animate-spin text-muted-foreground flex-shrink-0"
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Wallet size={18} />}
          label="Pending Earnings"
          value={formatRupees(pendingEarnings)}
          accent
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Total Earned"
          value={formatRupees(totalEarnings)}
        />
        <StatCard
          icon={<Users size={18} />}
          label="Referral Txns"
          value={`${transactions.filter((t) => t.txType === "referralBonus").length}`}
        />
        <StatCard
          icon={<CircleDollarSign size={18} />}
          label="Pending Withdrawal"
          value={formatRupees(pendingWithdrawalTotal)}
        />
      </div>

      {/* 3-Tier Commission Breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-600" />
          <h3 className="font-bold text-foreground text-sm">
            Multi-Tier Commission Breakdown
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Aapke refer kiye gaye users ki kamai se automatic commission
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Direct Earnings
                </p>
                <p className="text-xs text-muted-foreground">
                  Aapke khud ke conversions
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600">
              {formatRupees(
                (summary?.totalEarnings ?? 0n) -
                  (summary?.tier1Earnings ?? 0n) -
                  (summary?.tier2Earnings ?? 0n) -
                  (summary?.tier3Earnings ?? 0n) -
                  (summary?.tier4Earnings ?? 0n) -
                  (summary?.tier5Earnings ?? 0n),
              )}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                T1
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tier 1 Commission{" "}
                  <span className="text-emerald-600">(5%)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Aapke direct referrals ki kamai
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-600">
              {formatRupees(summary?.tier1Earnings ?? 0n)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                T2
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tier 2 Commission{" "}
                  <span className="text-emerald-600">(2%)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Aapke referrals ke referrals
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-purple-600">
              {formatRupees(summary?.tier2Earnings ?? 0n)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                T3
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tier 3 Commission{" "}
                  <span className="text-emerald-600">(1%)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  3rd level ka network bonus
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-600">
              {formatRupees(summary?.tier3Earnings ?? 0n)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center">
                T4
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tier 4 Commission{" "}
                  <span className="text-emerald-600">(0.5%)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  4th level ka network bonus
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-rose-600">
              {formatRupees(summary?.tier4Earnings ?? 0n)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center">
                T5
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Tier 5 Commission{" "}
                  <span className="text-emerald-600">(0.25%)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  5th level ka network bonus
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-teal-600">
              {formatRupees(summary?.tier5Earnings ?? 0n)}
            </span>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
          💡 A → B invite kare, B → C, C → D, D → E: E ki kamai par D ko 5%, C
          ko 2%, B ko 1%, A ko 0.5%, unka referrer ko 0.25% milta hai.
        </div>
      </div>

      {/* Redeem CTA */}
      <button
        type="button"
        data-ocid="offer_portal.redeem_button"
        onClick={onRedeem}
        className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold px-5 py-4 rounded-2xl shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Gift size={18} />
          </div>
          <div className="text-left">
            <p className="text-sm font-extrabold leading-none">
              Redeem Earnings
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              UPI/Bank withdrawal request
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/70" />
      </button>

      {/* Referral Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-amber-500" />
          <h3 className="font-bold text-foreground text-sm">
            Apna Referral Code
          </h3>
        </div>
        <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <span className="font-mono font-bold text-foreground text-base tracking-widest">
            {referralCode || "Loading..."}
          </span>
          <button
            type="button"
            data-ocid="offer_portal.copy_button"
            onClick={handleCopyReferral}
            className="p-2 rounded-lg hover:bg-border transition-colors"
            aria-label="Copy referral code"
          >
            <Copy size={15} className="text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Har referred user ki kamai ka{" "}
          <strong className="text-foreground">1%</strong> automatically aapke
          wallet mein aa jaata hai.
        </p>
        <button
          type="button"
          data-ocid="offer_portal.share_button"
          onClick={handleShareReferral}
          className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/5 transition-colors"
        >
          <ExternalLink size={14} />
          Share Referral Link
        </button>
      </div>

      {/* CPAGrip Offer Wall */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CircleDollarSign size={15} className="text-emerald-600" />
          <h3 className="font-bold text-foreground text-sm">
            Available Offers
          </h3>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
          <iframe
            src="https://www.cpagrip.com/view.php?id=1889594"
            style={{
              width: "100%",
              height: "600px",
              border: "none",
              borderRadius: "8px",
            }}
            title="CPAGrip Offer Wall"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center px-2">
          💡 Complete offers above to earn points. Earnings update within a few
          minutes.
        </p>
      </div>

      {/* Earnings List */}
      <div>
        <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-600" /> Recent Earnings
        </h3>
        {transactions.length === 0 ? (
          <div
            data-ocid="offer_portal.empty_state"
            className="bg-card border border-border rounded-2xl p-8 text-center"
          >
            <p className="text-3xl mb-2">💰</p>
            <p className="text-muted-foreground text-sm font-medium">
              Abhi koi earning nahi
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Offer complete karo ya dosto ko refer karo
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions
              .slice()
              .reverse()
              .slice(0, 10)
              .map((entry: OfferTransaction) => (
                <div
                  key={entry.id.toString()}
                  data-ocid="offer_portal.earning_row"
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm" aria-hidden>
                        {entry.txType === "cpalead"
                          ? "💰"
                          : entry.txType === "referralBonus"
                            ? "👥"
                            : "🎁"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          Number(entry.createdAt) / 1_000_000,
                        ).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm flex-shrink-0">
                    +{formatRupees(entry.amount)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Withdrawals */}
      {withdrawals.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground text-sm mb-3">
            Withdrawal History
          </h3>
          <div className="space-y-2">
            {withdrawals
              .slice()
              .reverse()
              .slice(0, 5)
              .map((w: OfferWithdrawal) => (
                <div
                  key={w.id.toString()}
                  data-ocid="offer_portal.withdrawal_row"
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatRupees(w.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.upiId}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      w.status === "approved" || w.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : w.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {w.status === "approved"
                      ? "✅ Approved"
                      : w.status === "paid"
                        ? "✅ Paid"
                        : w.status === "rejected"
                          ? "❌ Rejected"
                          : "⏳ Pending"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Redeem ───────────────────────────────────────────────────────────────────

function RedeemView({ onBack }: { onBack: () => void }) {
  const { currentOfferUser } = useOfferAuth();
  const offerUserId = currentOfferUser?.id ?? undefined;

  const { data: summary } = useOfferEarningsSummary(offerUserId);
  const withdrawalMutation = useRequestOfferWithdrawal();

  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");

  const MIN_WITHDRAWAL_PAISA = 5000n;
  const pendingEarnings = summary?.pendingEarnings ?? 0n;
  const minWithdrawalRupees = Number(MIN_WITHDRAWAL_PAISA) / 100;
  const pendingRupees = Number(pendingEarnings) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerUserId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const amtRupees = Number.parseFloat(amount);
    if (Number.isNaN(amtRupees) || amtRupees <= 0) {
      toast.error("Valid amount daalo");
      return;
    }
    const amtPaisa = BigInt(Math.round(amtRupees * 100));
    if (amtPaisa < MIN_WITHDRAWAL_PAISA) {
      toast.error(`Minimum withdrawal ₹${minWithdrawalRupees} hai`);
      return;
    }
    if (amtPaisa > pendingEarnings) {
      toast.error("Itna balance nahi hai");
      return;
    }
    if (!upiId.trim()) {
      toast.error("UPI ID daalo");
      return;
    }

    withdrawalMutation.mutate(
      { offerUserId, upiId: upiId.trim(), amount: amtPaisa },
      {
        onSuccess: () => {
          toast.success(
            "Withdrawal request submit ho gaya! Admin 24-48h mein process karega. 🎉",
          );
          onBack();
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Request fail hua. Dobara try karein.",
          );
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="flex-1 px-4 py-8 max-w-md mx-auto w-full"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} /> Dashboard
      </button>

      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Gift size={24} className="text-emerald-900" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground">
          Earnings Redeem Karein
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Available:{" "}
          <strong className="text-emerald-600">
            ₹{pendingRupees.toFixed(2)}
          </strong>
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
        <span className="text-lg mt-0.5" aria-hidden>
          ℹ️
        </span>
        <p className="text-amber-800 text-xs leading-relaxed">
          Minimum withdrawal: <strong>₹{minWithdrawalRupees}</strong>. Request
          ke 24-48 ghante mein Admin UPI se bhej dega.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="wd-amount"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Amount (₹) *
          </label>
          <input
            id="wd-amount"
            data-ocid="offer_portal.input"
            type="number"
            inputMode="decimal"
            min={minWithdrawalRupees}
            max={pendingRupees}
            step="1"
            placeholder={`Min ₹${minWithdrawalRupees}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <div>
          <label
            htmlFor="wd-upi"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            UPI ID *
          </label>
          <input
            id="wd-upi"
            data-ocid="offer_portal.input"
            type="text"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            required
          />
        </div>
        <button
          type="submit"
          data-ocid="offer_portal.submit_button"
          disabled={
            withdrawalMutation.isPending ||
            pendingEarnings < MIN_WITHDRAWAL_PAISA
          }
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm shadow-md"
        >
          {withdrawalMutation.isPending
            ? "Submitting..."
            : pendingEarnings < MIN_WITHDRAWAL_PAISA
              ? `Need ₹${minWithdrawalRupees} to Withdraw`
              : "Withdrawal Request Submit Karein →"}
        </button>
      </form>
    </motion.div>
  );
}

// ─── Admin: Offer Control Center ──────────────────────────────────────────────
// Exported separately so it can be embedded in AdminDashboardPage

export function OfferControlCenter() {
  const { data: config, isLoading: configLoading } = useOfferPortalConfig();
  const updateConfig = useUpdateOfferPortalConfig();
  const { data: offerUsers = [], isLoading: usersLoading } =
    useAdminListOfferUsers();
  const { data: pendingWithdrawals = [] } = useAdminListPendingWithdrawals();
  const { data: allWithdrawals = [] } = useAdminListAllWithdrawals();
  const resolveWithdrawal = useAdminResolveWithdrawal();

  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [cpagripApiKey, setCpagripApiKey] = useState("");
  const [cpagripWebhookSecret, setCpagripWebhookSecret] = useState("");
  const [cpagripOfferWallName, setCpagripOfferWallName] = useState("");
  const [adminPct, setAdminPct] = useState("60");
  const [userPct, setUserPct] = useState("40");

  // User list search
  const [userSearch, setUserSearch] = useState("");

  // Withdrawal tab: "pending" | "all"
  const [withdrawalTab, setWithdrawalTab] = useState<"pending" | "all">(
    "pending",
  );

  // Hydrate fields when config loads
  useEffect(() => {
    if (!config) return;
    setIsEnabled(config.isEnabled);
    setWebhookSecret(config.cpaLeadWebhookSecret ?? "");
    setCpagripApiKey(config.cpagripApiKey ?? "");
    setCpagripWebhookSecret(config.cpagripWebhookSecret ?? "");
    setCpagripOfferWallName(config.cpagripOfferWallName ?? "");
    setAdminPct(config.adminProfitPct?.toString() ?? "60");
    setUserPct(config.userProfitPct?.toString() ?? "40");
  }, [config]);

  const handleSave = () => {
    const a = Number(adminPct);
    const u = Number(userPct);
    if (a + u !== 100) {
      toast.error("Admin % + User % must equal 100");
      return;
    }
    updateConfig.mutate({
      isEnabled,
      cpaLeadWebhookSecret: webhookSecret.trim(),
      cpagripApiKey: cpagripApiKey.trim(),
      adminProfitPct: BigInt(a),
      userProfitPct: BigInt(u),
      newWebhookSecret: cpagripWebhookSecret.trim(),
      newOfferWallName: cpagripOfferWallName.trim(),
    });
  };

  const filteredUsers = userSearch.trim()
    ? offerUsers.filter((u) =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : offerUsers;

  const displayedWithdrawals =
    withdrawalTab === "pending"
      ? pendingWithdrawals
      : allWithdrawals
          .slice()
          .sort((a, b) => Number(b.requestedAt - a.requestedAt));

  if (configLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading config...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} className="text-emerald-600" />
          <h3 className="font-bold text-foreground text-sm">
            🚀 Offer Control Center
          </h3>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Portal Status
            </p>
            <p className="text-xs text-muted-foreground">
              Turn portal ON or OFF for all users
            </p>
          </div>
          <button
            type="button"
            data-ocid="offer_control.toggle"
            onClick={() => setIsEnabled((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              isEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"
            }`}
            aria-label="Toggle portal"
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                isEnabled ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        {/* Webhook / API Key */}
        <div>
          <label
            htmlFor="oc-webhook"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
          >
            Offer Wall API Key / Webhook Secret
          </label>
          <input
            id="oc-webhook"
            data-ocid="offer_control.api_key_input"
            type="text"
            placeholder="Paste your offer wall webhook secret here"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Works with any offer wall — CPALead, CPAGrip, AdWork, OGAds etc.
          </p>
        </div>

        {/* CPAGrip-specific fields */}
        <div className="space-y-3 border border-border/50 rounded-xl p-3 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            CPAGrip Settings
          </p>
          <div>
            <label
              htmlFor="oc-cpagrip-key"
              className="block text-xs text-muted-foreground mb-1"
            >
              CPAGrip API Key
            </label>
            <input
              id="oc-cpagrip-key"
              data-ocid="offer_control.cpagrip_api_key_input"
              type="text"
              placeholder="CPAGrip API Key"
              value={cpagripApiKey}
              onChange={(e) => setCpagripApiKey(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="oc-cpagrip-webhook"
              className="block text-xs text-muted-foreground mb-1"
            >
              CPAGrip Webhook Secret Key
            </label>
            <input
              id="oc-cpagrip-webhook"
              data-ocid="offer_control.cpagrip_webhook_input"
              type="text"
              placeholder="CPAGrip Webhook Secret"
              value={cpagripWebhookSecret}
              onChange={(e) => setCpagripWebhookSecret(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="oc-cpagrip-name"
              className="block text-xs text-muted-foreground mb-1"
            >
              Offer Wall Name
            </label>
            <input
              id="oc-cpagrip-name"
              data-ocid="offer_control.offer_wall_name_input"
              type="text"
              placeholder="e.g. CPAGrip, AdWork, OGAds"
              value={cpagripOfferWallName}
              onChange={(e) => setCpagripOfferWallName(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
        </div>

        {/* Profit Split */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="oc-admin-pct"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Admin Profit %
            </label>
            <input
              id="oc-admin-pct"
              data-ocid="offer_control.admin_pct"
              type="number"
              min={0}
              max={100}
              value={adminPct}
              onChange={(e) => setAdminPct(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div>
            <label
              htmlFor="oc-user-pct"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              User Profit %
            </label>
            <input
              id="oc-user-pct"
              data-ocid="offer_control.user_pct"
              type="number"
              min={0}
              max={100}
              value={userPct}
              onChange={(e) => setUserPct(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
        </div>
        {Number(adminPct) + Number(userPct) !== 100 &&
          adminPct !== "" &&
          userPct !== "" && (
            <p className="text-red-500 text-xs">
              Admin % + User % must add up to 100 (currently{" "}
              {Number(adminPct) + Number(userPct)})
            </p>
          )}

        <button
          type="button"
          data-ocid="offer_control.save_button"
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:opacity-60 text-sm"
        >
          {updateConfig.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={14} /> Save Config
            </>
          )}
        </button>
      </div>

      {/* ── User List with search ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Users size={15} className="text-emerald-600" />
            Registered Users
            {!usersLoading && (
              <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {offerUsers.length}
              </span>
            )}
          </h3>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            data-ocid="offer_control.user_search_input"
            placeholder="Email se search karein..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        {usersLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
            <Loader2 size={14} className="animate-spin" /> Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <p
            data-ocid="offer_control.empty_users"
            className="text-muted-foreground text-sm py-2"
          >
            {userSearch
              ? "Koi user nahi mila is email ke liye"
              : "Koi user abhi join nahi kiya"}
          </p>
        ) : (
          <div className="space-y-0 max-h-80 overflow-y-auto divide-y divide-border">
            {filteredUsers.map((u, idx) => (
              <div
                key={u.id.toString()}
                data-ocid={`offer_control.user_row.${idx + 1}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 text-xs font-bold">
                    {(u.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID #{u.id.toString()} • Ref:{" "}
                      <span className="font-mono">{u.referralCode}</span>
                      {u.referredBy && (
                        <span className="ml-1 text-blue-600">
                          via {u.referredBy}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined:{" "}
                      {new Date(
                        Number(u.createdAt) / 1_000_000,
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600">
                    {formatRupees(u.totalEarnings)}
                  </p>
                  <p className="text-xs text-muted-foreground">earned</p>
                  <p className="text-xs font-semibold text-amber-600">
                    {formatRupees(u.pendingEarnings)}
                  </p>
                  <p className="text-xs text-muted-foreground">pending</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Withdrawal Management ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Wallet size={15} className="text-amber-500" />
            Withdrawal Requests
            {pendingWithdrawals.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingWithdrawals.length} pending
              </span>
            )}
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4" role="tablist">
          {(["pending", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              data-ocid={`offer_control.withdrawal_tab.${tab}`}
              aria-selected={withdrawalTab === tab}
              onClick={() => setWithdrawalTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                withdrawalTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "pending" ? "⏳ Pending" : "📋 All"}
            </button>
          ))}
        </div>

        {displayedWithdrawals.length === 0 ? (
          <p
            data-ocid="offer_control.empty_withdrawals"
            className="text-muted-foreground text-sm py-2"
          >
            {withdrawalTab === "pending"
              ? "Koi pending withdrawal nahi"
              : "Abhi koi withdrawal request nahi"}
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {displayedWithdrawals.map((w, idx) => (
              <div
                key={w.id.toString()}
                data-ocid={`offer_control.withdrawal_row.${idx + 1}`}
                className="border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-foreground">
                        {formatRupees(w.amount)}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          w.status === "paid"
                            ? "bg-blue-100 text-blue-700"
                            : w.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : w.status === "rejected"
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {w.status === "paid"
                          ? "💸 Paid"
                          : w.status === "approved"
                            ? "✅ Approved"
                            : w.status === "rejected"
                              ? "❌ Rejected"
                              : "⏳ Pending"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono truncate">
                      UPI: {w.upiId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      User #{w.offerUserId.toString()} •{" "}
                      {new Date(
                        Number(w.requestedAt) / 1_000_000,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {w.adminNote && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Note: {w.adminNote}
                      </p>
                    )}
                  </div>
                </div>

                {w.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="offer_control.approve_btn"
                      onClick={() =>
                        resolveWithdrawal.mutate({
                          id: w.id,
                          newStatus: "approved",
                        })
                      }
                      disabled={resolveWithdrawal.isPending}
                      className="flex-1 bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60"
                    >
                      ✅ Approve
                    </button>
                    <button
                      type="button"
                      data-ocid="offer_control.paid_btn"
                      onClick={() =>
                        resolveWithdrawal.mutate({
                          id: w.id,
                          newStatus: "paid",
                        })
                      }
                      disabled={resolveWithdrawal.isPending}
                      className="flex-1 bg-blue-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                      💸 Mark Paid
                    </button>
                    <button
                      type="button"
                      data-ocid="offer_control.reject_btn"
                      onClick={() =>
                        resolveWithdrawal.mutate({
                          id: w.id,
                          newStatus: "rejected",
                        })
                      }
                      disabled={resolveWithdrawal.isPending}
                      className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}

                {w.status === "approved" && (
                  <button
                    type="button"
                    data-ocid="offer_control.paid_btn"
                    onClick={() =>
                      resolveWithdrawal.mutate({
                        id: w.id,
                        newStatus: "paid",
                      })
                    }
                    disabled={resolveWithdrawal.isPending}
                    className="w-full bg-blue-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
                  >
                    💸 Mark as Paid (Payment Bhej Diya)
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
